// Ficha de producto: lee ?id= de la URL y pinta el detalle desde
// data/catalogo.json (RF-03).
(() => {
  const estadoCarga = document.getElementById("estadoCarga");
  const ficha = document.getElementById("fichaProducto");
  const errorProducto = document.getElementById("errorProducto");
  const seccionRelacionados = document.getElementById("seccionRelacionados");
  const rejillaRelacionados = document.getElementById("rejillaRelacionados");

  if (!ficha) return;

  const TELEFONO_WHATSAPP = "593999999999";
  const CORREO_VENTAS = "ventas@comercialelite.com";

  function crearTarjetaRelacionada(producto) {
    const li = document.createElement("li");
    li.innerHTML = `
      <article class="tarjeta-producto">
        <figure>
          <img src="${producto.imagen}" alt="${producto.alt}" width="400" height="300" loading="lazy">
          <figcaption class="solo-lectores">${producto.nombre}</figcaption>
        </figure>
        <div class="tarjeta-producto__cuerpo">
          <h3><a href="producto.html?id=${encodeURIComponent(producto.id)}">${producto.nombre}</a></h3>
          <p class="tarjeta-producto__meta">${producto.id} · ${producto.presentacion}</p>
        </div>
      </article>
    `;
    return li;
  }

  function mostrarProducto(producto, todos) {
    document.title = `${producto.nombre} — Comercial Elite`;
    const meta = document.getElementById("descripcionPagina");
    if (meta) {
      meta.setAttribute(
        "content",
        `${producto.nombre}: ${producto.presentacion}. ${producto.uso}.`
      );
    }

    document.getElementById("migaProducto").textContent = producto.nombre;

    const figura = document.getElementById("figuraPrincipal");
    figura.innerHTML = `
      <img src="${producto.imagen}" alt="${producto.alt}" width="800" height="600" loading="lazy">
      <figcaption>${producto.nombre}</figcaption>
    `;

    document.getElementById("nombreProducto").textContent = producto.nombre;
    document.getElementById("codigoProducto").textContent = producto.id;
    document.getElementById("presentacionProducto").textContent = producto.presentacion;
    document.getElementById("coloresProducto").textContent = producto.colores.join(", ");
    document.getElementById("usoProducto").textContent = producto.uso;

    const mensajeWhatsApp = encodeURIComponent(
      `Hola, quiero cotizar el producto ${producto.id} - ${producto.nombre}.`
    );
    document.getElementById(
      "enlaceWhatsApp"
    ).href = `https://wa.me/${TELEFONO_WHATSAPP}?text=${mensajeWhatsApp}`;

    const asuntoCorreo = encodeURIComponent(`Cotización ${producto.id} — ${producto.nombre}`);
    const cuerpoCorreo = encodeURIComponent(
      `Hola,\n\nQuisiera solicitar una cotización para:\n\nProducto: ${producto.nombre}\nCódigo: ${producto.id}\nPresentación: ${producto.presentacion}\n\nGracias.`
    );
    document.getElementById(
      "enlaceCorreo"
    ).href = `mailto:${CORREO_VENTAS}?subject=${asuntoCorreo}&body=${cuerpoCorreo}`;

    const relacionados = todos
      .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
      .slice(0, 3);

    if (relacionados.length > 0) {
      rejillaRelacionados.innerHTML = "";
      relacionados.forEach((p) => rejillaRelacionados.append(crearTarjetaRelacionada(p)));
      seccionRelacionados.hidden = false;
    }

    estadoCarga.hidden = true;
    ficha.hidden = false;
  }

  function mostrarError() {
    estadoCarga.hidden = true;
    errorProducto.hidden = false;
  }

  const parametros = new URLSearchParams(window.location.search);
  const id = parametros.get("id");

  if (!id) {
    mostrarError();
    return;
  }

  fetch("data/catalogo.json")
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((datos) => {
      const producto = datos.productos.find((p) => p.id === id);
      if (!producto) {
        mostrarError();
        return;
      }
      mostrarProducto(producto, datos.productos);
    })
    .catch((error) => {
      console.error("No se pudo cargar la ficha de producto:", error);
      mostrarError();
    });
})();
