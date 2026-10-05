// Punto de entrada (ES module). Orquesta: repo (datos) -> estado -> view (DOM).
//
//   repo.js     catálogo: IndexedDB primero, red después (offline-first)
//   db.js       envoltorio de IndexedDB
//   storage.js  localStorage / sessionStorage / cookies
//   cart.js     carrito (localStorage) y pedidos (IndexedDB)
//   contact.js  formulario de contacto (localStorage + sessionStorage + bandeja en IndexedDB)
//   view.js     renderizado accesible

import * as repo from "./repo.js";
import * as db from "./db.js";
import * as view from "./view.js";
import { Carrito } from "./cart.js";
import { iniciarContacto, borrarDatosContacto } from "./contact.js";
import { CLAVES, COOKIES, cookies, local, sesion } from "./storage.js";

const $ = (selector) => document.querySelector(selector);

const FILTROS_VACIOS = Object.freeze({ texto: "", marcas: [], franquicias: [], escalas: [], orden: "relevancia" });

const estado = {
  productos: [],
  filtros: leerFiltros(),
  vista: cookies.leer(COOKIES.vista) === "lista" ? "lista" : "cuadricula",
};

const carrito = new Carrito();

// ======================= Filtros (sessionStorage) =======================
function leerFiltros() {
  const g = sesion.leer(CLAVES.filtros, null);
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    texto: typeof g?.texto === "string" ? g.texto : "",
    marcas: lista(g?.marcas),
    franquicias: lista(g?.franquicias),
    escalas: lista(g?.escalas),
    orden: typeof g?.orden === "string" ? g.orden : "relevancia",
  };
}

function guardarFiltros() {
  sesion.guardar(CLAVES.filtros, estado.filtros);
}

function leerFiltrosDelFormulario() {
  const form = $("#form-filtros");
  const marcados = (nombre) => [...form.querySelectorAll(`input[name="${nombre}"]:checked`)].map((i) => i.value);
  estado.filtros = {
    texto: form.elements.texto.value.trim(),
    marcas: marcados("marcas"),
    franquicias: marcados("franquicias"),
    escalas: marcados("escalas"),
    orden: form.elements.orden.value,
  };
}

function pintarFormularioFiltros() {
  const f = repo.facetas(estado.productos);
  view.renderOpcionesFiltro($("#filtro-marcas"), "marcas", f.marcas, estado.filtros.marcas);
  view.renderOpcionesFiltro($("#filtro-franquicias"), "franquicias", f.franquicias, estado.filtros.franquicias);
  view.renderOpcionesFiltro($("#filtro-escalas"), "escalas", f.escalas, estado.filtros.escalas);
  $("#filtro-texto").value = estado.filtros.texto;
  $("#filtro-orden").value = estado.filtros.orden;
}

function aplicarFiltros({ anunciar = false } = {}) {
  guardarFiltros();
  const resultado = repo.filtrar(estado.productos, estado.filtros);
  view.renderProductos(resultado, {
    vista: estado.vista,
    unidadesEnCarrito: (id) => carrito.lineas().find((l) => l.producto.id === id)?.cantidad ?? 0,
    alAgregar: agregarAlCarrito,
  });
  view.renderResumenResultados(resultado.length, estado.productos.length);
  view.renderFiltrosActivos($("#filtros-activos"), estado.filtros, quitarFiltro);
  // El resumen ya es aria-live; "anunciar" solo se usa para acciones sin región propia.
  if (anunciar) view.anunciar($("#resumen-resultados").textContent);
  pintarTablaPersistencia();
}

function quitarFiltro(campo, valor) {
  if (campo === "texto") estado.filtros.texto = "";
  else estado.filtros[campo] = estado.filtros[campo].filter((v) => v !== valor);
  pintarFormularioFiltros();
  aplicarFiltros();
  // El chip pulsado desaparece: el foco pasa al resumen de resultados (no se pierde en <body>).
  $("#titulo-catalogo").focus();
}

function limpiarFiltros() {
  estado.filtros = { ...FILTROS_VACIOS, marcas: [], franquicias: [], escalas: [] };
  pintarFormularioFiltros();
  aplicarFiltros();
}

function elegirCategoria(campo, valor) {
  estado.filtros = { ...FILTROS_VACIOS, marcas: [], franquicias: [], escalas: [], [campo]: [valor] };
  pintarFormularioFiltros();
  aplicarFiltros();
  // Lleva al usuario (y al foco del teclado) a los resultados.
  const titulo = $("#titulo-catalogo");
  titulo.scrollIntoView();
  titulo.focus({ preventScroll: true });
  view.anunciar(`Filtrado por ${valor}. ${$("#resumen-resultados").textContent}.`);
}

function conectarFiltros() {
  const form = $("#form-filtros");
  let temporizador;
  form.addEventListener("input", (evento) => {
    if (evento.target.name !== "texto") return;
    clearTimeout(temporizador);
    // Debounce: no re-renderizar en cada tecla.
    temporizador = setTimeout(() => {
      leerFiltrosDelFormulario();
      aplicarFiltros();
    }, 250);
  });
  form.addEventListener("change", (evento) => {
    if (evento.target.name === "texto") return;
    leerFiltrosDelFormulario();
    aplicarFiltros();
  });
  form.addEventListener("submit", (evento) => {
    // Enter en el buscador: aplica al instante y no recarga la página.
    evento.preventDefault();
    clearTimeout(temporizador);
    leerFiltrosDelFormulario();
    aplicarFiltros({ anunciar: true });
  });
  form.addEventListener("reset", (evento) => {
    evento.preventDefault();
    limpiarFiltros();
    view.anunciar("Filtros borrados. " + $("#resumen-resultados").textContent);
  });
  $("#boton-limpiar-vacio").addEventListener("click", () => {
    limpiarFiltros();
    $("#filtro-texto").focus();
  });

  // Panel de filtros plegable en pantallas pequeñas (patrón disclosure).
  const botonFiltros = $("#boton-filtros");
  botonFiltros.addEventListener("click", () => {
    const abierto = botonFiltros.getAttribute("aria-expanded") === "true";
    botonFiltros.setAttribute("aria-expanded", String(!abierto));
    botonFiltros.textContent = abierto ? "Mostrar filtros" : "Ocultar filtros";
    $("#panel-filtros").classList.toggle("hidden", abierto);
    if (!abierto) $("#filtro-texto").focus();
  });

  // Vista cuadrícula / lista: preferencia en cookie.
  document.querySelectorAll('input[name="vista"]').forEach((radio) => {
    radio.checked = radio.value === estado.vista;
    radio.addEventListener("change", () => {
      estado.vista = radio.value;
      cookies.guardar(COOKIES.vista, estado.vista);
      aplicarFiltros();
    });
  });
}

// ======================= Carrito =======================
function agregarAlCarrito(id) {
  const { mensaje } = carrito.agregar(id);
  view.anunciar(mensaje);
  // El evento "cambio" ya re-renderizó la lista (de forma síncrona) y el botón pulsado
  // fue reemplazado: el foco vuelve al botón nuevo del mismo producto (WCAG 2.4.3).
  // Si quedó deshabilitado (stock agotado), va al título de la tarjeta.
  const titulo = document.querySelector(`#prod-${CSS.escape(id)}`);
  const boton = titulo?.closest("article")?.querySelector("[data-agregar]");
  if (boton && !boton.disabled) {
    boton.focus();
  } else if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus();
  }
}

function pintarCarrito(enfocar) {
  view.renderContadorCarrito(carrito.unidades());
  view.renderCarrito(carrito.lineas(), carrito.total(), {
    alCambiar: (id, cantidad, accion) => {
      const { mensaje } = carrito.cambiarCantidad(id, cantidad);
      view.anunciar(mensaje);
      pintarCarrito({ id, accion });
    },
    alQuitar: (id) => {
      view.anunciar(carrito.quitar(id).mensaje);
      pintarCarrito({ id: null });
    },
  });
  if (enfocar) {
    const fila = enfocar.id && document.querySelector(`#lista-carrito [data-id="${CSS.escape(enfocar.id)}"]`);
    let destino = fila?.querySelector(`[data-accion="${enfocar.accion}"]`);
    if (destino?.disabled) destino = fila.querySelector('[data-accion="cantidad"]');
    // Si la fila desapareció, el foco va al primer control útil del diálogo.
    (destino ?? document.querySelector("#lista-carrito button") ?? $("#boton-cerrar-carrito")).focus();
  }
}

function conectarCarrito() {
  const dialogo = $("#dialogo-carrito");
  const botonAbrir = $("#boton-carrito");

  carrito.addEventListener("cambio", () => {
    // Cubre también cambios hechos en OTRA pestaña (evento "storage" en cart.js).
    if (dialogo.open) pintarCarrito();
    else view.renderContadorCarrito(carrito.unidades());
    if (estado.productos.length) aplicarFiltros();
  });

  botonAbrir.addEventListener("click", () => {
    $("#pedido-confirmado").hidden = true;
    pintarCarrito();
    dialogo.showModal();
    $("#boton-cerrar-carrito").focus();
  });
  $("#boton-cerrar-carrito").addEventListener("click", () => dialogo.close());
  // Clic en el fondo (fuera del contenido) cierra, igual que Esc.
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  // Al cerrar, el foco vuelve al botón que abrió el diálogo (WCAG 2.4.3).
  dialogo.addEventListener("close", () => botonAbrir.focus());

  $("#boton-vaciar-carrito").addEventListener("click", () => {
    carrito.vaciar();
    pintarCarrito();
    view.anunciar("Carrito vaciado.");
    $("#boton-cerrar-carrito").focus();
  });

  $("#boton-confirmar-pedido").addEventListener("click", async () => {
    try {
      const pedido = await carrito.confirmar();
      pintarCarrito();
      view.mostrarPedidoConfirmado(pedido);
      view.anunciar(`Pedido número ${pedido.id} registrado por ${view.precio(pedido.total)}.`);
      $("#boton-cerrar-carrito").focus();
      pintarTablaPersistencia();
    } catch (error) {
      view.anunciar(`No se pudo registrar el pedido: ${error.message}`);
    }
  });
}

// ======================= Menú móvil =======================
function conectarMenu() {
  const boton = $("#boton-menu");
  const menu = $("#menu-principal");
  const cerrar = () => {
    boton.setAttribute("aria-expanded", "false");
    menu.classList.add("hidden");
  };
  boton.addEventListener("click", () => {
    const abierto = boton.getAttribute("aria-expanded") === "true";
    boton.setAttribute("aria-expanded", String(!abierto));
    menu.classList.toggle("hidden", abierto);
    if (!abierto) menu.querySelector("a")?.focus();
  });
  menu.addEventListener("click", (evento) => {
    if (evento.target.closest("a") && boton.offsetParent !== null) cerrar();
  });
  menu.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && boton.offsetParent !== null) {
      cerrar();
      boton.focus();
    }
  });
}

// ======================= Tabla de persistencia =======================
let temporizadorTabla;
function pintarTablaPersistencia() {
  clearTimeout(temporizadorTabla);
  temporizadorTabla = setTimeout(async () => {
    const contar = (almacen) => db.contar(almacen).catch(() => "?");
    const [nProductos, nPedidos, nMensajes] = await Promise.all([
      contar(db.ALMACENES.productos),
      contar(db.ALMACENES.pedidos),
      contar(db.ALMACENES.bandeja),
    ]);
    const contacto = local.leer(CLAVES.contacto, null);
    const privado = sesion.leer(CLAVES.contactoPrivado, {}) ?? {};
    const camposPrivados = Object.values(privado).filter((v) => typeof v === "string" && v.trim()).length;
    const f = estado.filtros;
    const nFiltros = (f.texto ? 1 : 0) + f.marcas.length + f.franquicias.length + f.escalas.length;
    let archivosCache = "no disponible";
    try {
      if ("caches" in window) {
        const nombres = await caches.keys();
        const tamanos = await Promise.all(nombres.map(async (n) => (await (await caches.open(n)).keys()).length));
        archivosCache = `${tamanos.reduce((a, b) => a + b, 0)} archivos en ${nombres.length} caché(s)`;
      }
    } catch {
      /* Cache Storage puede no estar disponible fuera de un contexto seguro */
    }

    view.renderTablaPersistencia([
      {
        mecanismo: "IndexedDB",
        guarda: "Catálogo completo, pedidos confirmados y bandeja de salida de mensajes",
        duracion: "Permanente (hasta que lo borres)",
        estado: `${nProductos} productos · ${nPedidos} pedidos · ${nMensajes} mensajes`,
      },
      {
        mecanismo: "localStorage",
        guarda: "Correo y teléfono de contacto; contenido del carrito",
        duracion: "Permanente (hasta que lo borres)",
        estado: `Contacto: ${contacto?.email || contacto?.telefono ? "guardado" : "vacío"} · Carrito: ${carrito.unidades()} unidades`,
      },
      {
        mecanismo: "sessionStorage",
        guarda: "Filtros de búsqueda; nombre, documento, dirección y mensaje",
        duracion: "Hasta cerrar esta pestaña",
        estado: `${nFiltros} filtros activos · ${camposPrivados} datos personales en sesión`,
      },
      {
        mecanismo: "Cookies",
        guarda: "Vista preferida del catálogo y fecha de la última visita (sin datos personales)",
        duracion: "180 días",
        estado: `vista=${cookies.leer(COOKIES.vista) ?? "(por defecto)"} · última visita registrada`,
      },
      {
        mecanismo: "Cache Storage (Service Worker)",
        guarda: "HTML, CSS, JS, imágenes y JSON de la app para abrirla sin red",
        duracion: "Hasta que se publique una versión nueva",
        estado: archivosCache,
      },
    ]);
  }, 100);
}

function conectarBorrado() {
  const confirmar = $("#confirmar-borrado");
  $("#boton-refrescar-datos").addEventListener("click", () => {
    pintarTablaPersistencia();
    view.anunciar("Tabla de datos actualizada.");
  });
  // Confirmación en línea en vez de window.confirm(): accesible y con estilo consistente.
  $("#boton-borrar-todo").addEventListener("click", () => {
    confirmar.hidden = false;
    $("#boton-cancelar-borrado").focus();
  });
  $("#boton-cancelar-borrado").addEventListener("click", () => {
    confirmar.hidden = true;
    $("#boton-borrar-todo").focus();
  });
  $("#boton-confirmar-borrado").addEventListener("click", async () => {
    borrarDatosContacto();
    carrito.vaciar();
    [CLAVES.recordarContacto].forEach((c) => local.borrar(c));
    sesion.borrar(CLAVES.filtros);
    Object.values(COOKIES).forEach((c) => cookies.borrar(c));
    await Promise.allSettled(Object.values(db.ALMACENES).map((a) => db.vaciar(a)));
    // Se recarga para volver a descargar el catálogo y dejar todo en estado inicial.
    location.reload();
  });
}

// ======================= Red, Service Worker e instalación =======================
function conectarRed() {
  view.mostrarEstadoRed(navigator.onLine);
  window.addEventListener("online", () => {
    view.mostrarEstadoRed(true);
    // Al volver la red se intenta refrescar el catálogo en segundo plano.
    repo.cargarCatalogo(alActualizarCatalogo).catch(() => {});
  });
  window.addEventListener("offline", () => view.mostrarEstadoRed(false));
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[app] Este navegador no soporta Service Workers: no habrá modo offline.");
    return;
  }
  try {
    const registro = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    const avisar = (worker) => {
      $("#aviso-actualizacion").hidden = false;
      $("#boton-actualizar").onclick = () => worker.postMessage({ tipo: "SKIP_WAITING" });
    };
    if (registro.waiting && navigator.serviceWorker.controller) avisar(registro.waiting);
    registro.addEventListener("updatefound", () => {
      const nuevo = registro.installing;
      nuevo?.addEventListener("statechange", () => {
        // Solo es "actualización" si ya había un SW controlando la página.
        if (nuevo.state === "installed" && navigator.serviceWorker.controller) avisar(nuevo);
      });
    });
    let recargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    });
    navigator.serviceWorker.ready.then(() => pintarTablaPersistencia());
  } catch (error) {
    console.error("[app] No se pudo registrar el Service Worker:", error);
  }
}

function conectarInstalacion() {
  let eventoInstalar = null;
  const boton = $("#boton-instalar");
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    eventoInstalar = evento;
    boton.hidden = false;
  });
  boton.addEventListener("click", async () => {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    eventoInstalar = null;
    boton.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    boton.hidden = true;
    view.anunciar("Hangar Kits se instaló en tu dispositivo.");
  });
}

// ======================= Catálogo =======================
function usarCatalogo(productos) {
  estado.productos = productos;
  carrito.usarCatalogo(productos);
  const f = repo.facetas(productos);
  view.mostrarResumenTienda(productos, f);
  view.renderCategorias($("#categorias-marca"), f.marcas, "marcas", elegirCategoria);
  view.renderCategorias($("#categorias-franquicia"), f.franquicias, "franquicias", elegirCategoria);
  view.renderCategorias($("#categorias-escala"), f.escalas, "escalas", elegirCategoria);
  view.renderCreditos(productos);
  pintarFormularioFiltros();
  aplicarFiltros();
}

function alActualizarCatalogo(productos, meta) {
  usarCatalogo(productos);
  view.mostrarOrigenCatalogo("red", meta);
  view.anunciar("El catálogo se actualizó con la última versión.");
}

// ======================= Arranque =======================
async function iniciar() {
  // Cookie de última visita: se muestra la anterior y se guarda la actual.
  const anterior = cookies.leer(COOKIES.ultimaVisita);
  $("#ultima-visita").textContent = anterior ? view.fecha(anterior) : "esta es tu primera visita";
  cookies.guardar(COOKIES.ultimaVisita, new Date().toISOString());

  conectarRed();
  conectarMenu();
  conectarFiltros();
  conectarCarrito();
  conectarBorrado();
  conectarInstalacion();
  iniciarContacto({ anunciar: view.anunciar, alCambiarDatos: pintarTablaPersistencia });
  view.renderContadorCarrito(carrito.unidades());

  try {
    const { productos, origen, meta } = await repo.cargarCatalogo(alActualizarCatalogo);
    usarCatalogo(productos);
    view.mostrarOrigenCatalogo(origen, meta);
  } catch (error) {
    view.mostrarErrorCatalogo(error.message);
  }

  registrarServiceWorker();
}

iniciar();
