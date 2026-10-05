// Repositorio del catálogo: decide DE DÓNDE salen los productos.
//
// Estrategia "offline-first" en dos pasos:
//   1. Se lee primero IndexedDB y se pinta al instante (funciona sin red).
//   2. En paralelo se pide data/productos.json; si llega una versión distinta, se
//      guarda en IndexedDB y se avisa para volver a pintar.
// Si es la primera visita y no hay red ni IndexedDB, se lanza un error claro.

import * as db from "./db.js";

const URL_CATALOGO = "data/productos.json";

function validarProducto(p) {
  return (
    p &&
    typeof p.id === "string" &&
    typeof p.nombre === "string" &&
    typeof p.marca === "string" &&
    typeof p.franquicia === "string" &&
    typeof p.escala === "string" &&
    Number.isFinite(p.precio) &&
    Number.isInteger(p.stock)
  );
}

async function descargarCatalogo() {
  const respuesta = await fetch(URL_CATALOGO, { headers: { Accept: "application/json" } });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al pedir el catálogo`);
  const datos = await respuesta.json();
  if (!Array.isArray(datos?.productos)) throw new Error("El catálogo no tiene el formato esperado.");
  // Se descartan registros mal formados en vez de romper toda la vista.
  return { version: String(datos.version ?? ""), productos: datos.productos.filter(validarProducto) };
}

export async function leerMetaCatalogo() {
  try {
    return (await db.obtener(db.ALMACENES.meta, "catalogo")) ?? null;
  } catch {
    return null;
  }
}

/**
 * Carga el catálogo.
 * @param {(productos: object[], meta: object) => void} alActualizar se llama si la red trae una versión nueva.
 * @returns {Promise<{ productos: object[], origen: "indexeddb" | "red", meta: object | null }>}
 */
export async function cargarCatalogo(alActualizar) {
  let locales = [];
  try {
    locales = await db.obtenerTodos(db.ALMACENES.productos);
  } catch (error) {
    console.warn("[repo] No se pudo leer IndexedDB:", error);
  }
  const metaLocal = await leerMetaCatalogo();

  const sincronizar = descargarCatalogo().then(async ({ version, productos }) => {
    if (metaLocal?.version === version && locales.length === productos.length) return null;
    await db.reemplazarCatalogo(productos, version);
    return { productos, meta: await leerMetaCatalogo() };
  });

  if (locales.length > 0) {
    // Hay copia local: se devuelve ya y la sincronización sigue en segundo plano.
    sincronizar
      .then((nuevo) => nuevo && alActualizar?.(nuevo.productos, nuevo.meta))
      .catch((error) => console.info("[repo] Sin red: se mantiene el catálogo de IndexedDB.", error.message));
    return { productos: locales, origen: "indexeddb", meta: metaLocal };
  }

  // Primera visita: no hay nada local, hay que esperar a la red.
  const nuevo = await sincronizar.catch((error) => {
    throw new Error(
      `No hay catálogo guardado y no se pudo descargar (${error.message}). Conéctate a internet una vez para usar la tienda sin conexión.`
    );
  });
  if (nuevo) return { productos: nuevo.productos, origen: "red", meta: nuevo.meta };
  return { productos: locales, origen: "indexeddb", meta: metaLocal };
}

// ---- Consultas puras sobre el arreglo de productos (sin efectos secundarios) ----

const normalizar = (texto) =>
  String(texto)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// "1/144" -> 144: sirve para ordenar escalas de menor a mayor tamaño de modelo.
const denominador = (escala) => Number(String(escala).split("/")[1]) || 0;

export function facetas(productos) {
  const contar = (campo) => {
    const mapa = new Map();
    productos.forEach((p) => mapa.set(p[campo], (mapa.get(p[campo]) ?? 0) + 1));
    return mapa;
  };
  const ordenAlfabetico = (mapa) =>
    [...mapa].sort(([a], [b]) => a.localeCompare(b, "es")).map(([valor, total]) => ({ valor, total }));
  return {
    marcas: ordenAlfabetico(contar("marca")),
    franquicias: ordenAlfabetico(contar("franquicia")),
    // Escalas de la más grande (1/24) a la más pequeña (1/144).
    escalas: [...contar("escala")]
      .sort(([a], [b]) => denominador(a) - denominador(b))
      .map(([valor, total]) => ({ valor, total })),
  };
}

export function filtrar(productos, filtros) {
  const texto = normalizar(filtros.texto ?? "").trim();
  const resultado = productos.filter((p) => {
    if (filtros.marcas?.length && !filtros.marcas.includes(p.marca)) return false;
    if (filtros.franquicias?.length && !filtros.franquicias.includes(p.franquicia)) return false;
    if (filtros.escalas?.length && !filtros.escalas.includes(p.escala)) return false;
    if (!texto) return true;
    const pajar = normalizar([p.nombre, p.marca, p.linea, p.franquicia, p.serie, p.escala].join(" "));
    return texto.split(/\s+/).every((palabra) => pajar.includes(palabra));
  });

  const comparadores = {
    "precio-asc": (a, b) => a.precio - b.precio,
    "precio-desc": (a, b) => b.precio - a.precio,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    escala: (a, b) => denominador(a.escala) - denominador(b.escala),
  };
  const comparar = comparadores[filtros.orden];
  return comparar ? [...resultado].sort(comparar) : resultado;
}
