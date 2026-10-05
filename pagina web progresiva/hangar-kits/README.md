# Hangar Kits — PWA de model kits (offline-first)

Tienda ficticia y académica de model kits (Gunpla, Tamiya, Zoids, Macross, aviación)
hecha con **HTML5 semántico, Tailwind CSS + CSS Grid, JavaScript ES6+ (módulos)** y
pensada para **funcionar sin conexión** y cumplir **WCAG 2.2 AA**.

## Cómo ejecutarla

Un Service Worker **no funciona con `file://`**: hace falta un servidor (localhost cuenta como contexto seguro).

```bash
cd "pagina web progresiva/hangar-kits"
python3 -m http.server 8080        # o: npm run serve
# abrir http://localhost:8080
```

Para probar el modo offline: abrir la página una vez con red → DevTools → *Network* → *Offline*
(o desconectar el wifi) → recargar. La tienda abre completa: catálogo, imágenes, filtros, carrito,
pedidos y formulario.

Si se modifica `assets/tailwind.css` o se agregan clases nuevas en el HTML/JS:

```bash
npm install          # una sola vez (instala el CLI de Tailwind 3.4)
npm run build:css    # regenera assets/styles.css
```

> Si cambias cualquier archivo precargado, sube `VERSION` en `sw.js`; si no, los navegadores
> que ya visitaron el sitio seguirán usando la copia en caché. La página muestra el aviso
> "Actualizar ahora" cuando detecta una versión nueva.

## Estructura

```
index.html              header, nav, main (secciones), footer, <dialog> del carrito, <template>
manifest.webmanifest    instalación como app
sw.js                   Service Worker (en la raíz para que su scope cubra todo el sitio)
assets/
  tailwind.css          fuente de estilos (Tailwind + capa base/componentes)
  styles.css            CSS compilado (NO editar a mano)
  img/                  18 fotos de kits reales (WebP 800×600)
  icons/                íconos de la PWA
data/productos.json     catálogo (marca, franquicia, serie, escala, precio, stock, crédito de la foto)
js/
  app.js                punto de entrada: orquesta todo
  repo.js               catálogo: IndexedDB primero, red después; filtros y facetas
  db.js                 envoltorio de IndexedDB con Promesas
  storage.js            localStorage / sessionStorage / cookies
  cart.js               carrito (clase con campos privados, EventTarget)
  contact.js            formulario de contacto, validación accesible, bandeja de salida
  view.js               renderizado del DOM (sin innerHTML con datos)
```

## Persistencia: qué se guarda dónde

| Mecanismo | Qué guarda | Por qué ahí |
|---|---|---|
| **IndexedDB** | Catálogo completo, pedidos, bandeja de salida | Datos estructurados y voluminosos, consultas por índice (marca/franquicia/escala), asíncrono |
| **sessionStorage** | Filtros de búsqueda; nombre, documento, dirección y mensaje | Deben durar solo mientras la pestaña está abierta; los datos delicados mueren al cerrarla |
| **localStorage** | Correo y teléfono; carrito | Deben sobrevivir entre visitas (el usuario puede desactivar "Recordar") |
| **Cookies** | Vista preferida, fecha de última visita | Preferencias mínimas sin datos personales (`SameSite=Lax`) |
| **Cache Storage** | HTML, CSS, JS, imágenes, JSON | Lo usa el Service Worker para abrir la app sin red |

La sección **"Mis datos"** de la página muestra el estado real de cada mecanismo y permite borrarlo todo.

## Estrategia offline

1. **Instalación del SW**: precarga app shell + 18 imágenes + `productos.json` (35 archivos).
2. **Catálogo**: `repo.js` pinta primero desde IndexedDB (instantáneo, sin red) y en paralelo pide
   el JSON; si hay versión nueva, la guarda en IndexedDB en **una sola transacción** y vuelve a pintar.
3. **HTML**: red primero, caché de respaldo. **JSON**: *stale-while-revalidate*. **Estáticos**: caché primero.
4. **Acciones sin red**: los pedidos se guardan en IndexedDB; los mensajes de contacto quedan
   "pendientes" en la bandeja y se procesan con el evento `online` (envío simulado: no hay backend).

## Accesibilidad (WCAG 2.2 AA) y teclado

- Landmarks (`header`, `nav`, `main`, `aside`, `footer`), jerarquía de títulos, `lang="es"`.
- Enlace "Saltar al contenido" (2.4.1); foco visible de dos tonos (2.4.7, 1.4.11).
- `scroll-padding-top` para que el header sticky no tape el foco (2.4.11, nuevo en 2.2).
- Objetivos táctiles de al menos 44×44 px (2.5.8 pide 24 px).
- Carrito en `<dialog>` modal nativo: confina el foco, `Esc` cierra y el foco vuelve al botón (2.4.3).
- Después de agregar o cambiar cantidades el foco **no se pierde** al re-renderizar.
- Regiones `aria-live` / `role="status"` para resultados, carrito y estado de red (4.1.3).
- Formulario: `label` en cada campo, `autocomplete`, errores con `aria-invalid` +
  `aria-describedby`, resumen de errores enfocable con enlaces (3.3.1, 3.3.3).
- Datos recordados entre visitas, sin volver a escribirlos (3.3.7, nuevo en 2.2).
- La información nunca se transmite solo con color (1.4.1); contraste AA en toda la paleta.

Verificado con **axe-core** (etiquetas wcag2a/aa, wcag21aa, wcag22aa) en escritorio y móvil: 0 violaciones.
Igual conviene una revisión manual con lector de pantalla (NVDA/Orca).

## Diseño (teoría del color e IHC)

- **Paleta**: tríada primaria del RX-78-2 (azul / rojo / amarillo) con la regla **60-30-10**:
  60 % neutros (slate), 30 % azul marino estructural (header/footer), 10 % amarillo de acento
  para acciones de alto nivel (carrito, "Ver catálogo"). El azul `blue-700` es el color de acción
  primaria; el **rojo se reserva para errores y acciones destructivas**, así su significado es consistente.
- **IHC**: reconocer antes que recordar (categorías como botones con conteo, chips de filtros
  activos), visibilidad del estado del sistema (barra de conexión, origen del catálogo, bandeja),
  control y libertad del usuario (quitar filtros, vaciar carrito, borrar datos con confirmación),
  prevención de errores (stock máximo, validación en línea) y consistencia (un solo sistema de botones).

## Créditos de imágenes

Fotos de kits reales armados por sus autores, obtenidas de Flickr/Wikimedia Commons vía
Openverse con licencias **CC BY 2.0 / CC BY-SA 2.0**. Autor, licencia y enlace al original de
cada foto están en `data/productos.json` y en el pie de la página ("Créditos de las fotografías").
Las fotos se recortaron a 4:3 y se convirtieron a WebP (obra derivada, misma licencia en las BY-SA).
Marcas y franquicias pertenecen a sus dueños; precios referenciales.
