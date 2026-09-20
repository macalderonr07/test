// Catálogo: carga data/catalogo.json, renderiza la rejilla y filtra en el
// navegador sin recargar la página (RF-02, RF-04, RNF-04).
// Las tarjetas se pintan con las mismas utilidades de Tailwind que usa el
// resto del sitio; Tailwind Play CDN observa el DOM y genera los estilos
// para estas clases aunque se añadan después de la carga inicial.
(() => {
  const rejilla = document.getElementById("rejillaProductos");
  const contador = document.getElementById("contadorResultados");
  const sinResultados = document.getElementById("sinResultados");
  const errorCarga = document.getElementById("errorCarga");
  const fieldsetCategoria = document.getElementById("filtroCategoria");
  const buscador = document.getElementById("buscador");
  const botonLimpiar = document.getElementById("botonLimpiar");
  const botonLimpiarAlterno = document.getElementById("botonLimpiarAlterno");

  if (!rejilla) return;

  let productos = [];
  let categorias = [];

  const normalizar = (texto) =>
    texto
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const parametros = new URLSearchParams(window.location.search);
  const categoriaInicial = parametros.get("cat");

  function crearFiltrosCategoria() {
    categorias.forEach(({ slug, nombre }) => {
      const total = productos.filter((p) => p.categoria === slug).length;
      const id = `filtro-${slug}`;
      const contenedor = document.createElement("div");
      contenedor.className = "flex min-h-9 items-center gap-2";

      const casilla = document.createElement("input");
      casilla.type = "checkbox";
      casilla.id = id;
      casilla.name = "categoria";
      casilla.value = slug;
      casilla.className = "h-5 w-5 accent-elite-dark dark:accent-elitenight-dark";
      if (categoriaInicial === slug) casilla.checked = true;

      const etiqueta = document.createElement("label");
      etiqueta.setAttribute("for", id);
      etiqueta.textContent = `${nombre} (${total})`;

      contenedor.append(casilla, etiqueta);
      fieldsetCategoria.append(contenedor);
    });
  }

  function crearTarjeta(producto) {
    const li = document.createElement("li");

    const articulo = document.createElement("article");
    articulo.className =
      "tarjeta-producto relative flex flex-col overflow-hidden rounded-lg border border-elite-border bg-white shadow-[0_1px_3px_rgba(26,26,26,0.12)] dark:border-elitenight-border dark:bg-elitenight-bg";
    articulo.dataset.categoria = producto.categoria;
    articulo.dataset.buscable = normalizar(
      [producto.nombre, producto.id, producto.subcategoria, producto.uso].join(" ")
    );

    const figura = document.createElement("figure");
    figura.className = "m-0 bg-elite-tint dark:bg-elitenight-tint";
    const img = document.createElement("img");
    img.src = producto.imagen;
    img.alt = producto.alt;
    img.width = 400;
    img.height = 300;
    img.loading = "lazy";
    const figcaption = document.createElement("figcaption");
    figcaption.className = "sr-only";
    figcaption.textContent = producto.nombre;
    figura.append(img, figcaption);

    const cuerpo = document.createElement("div");
    cuerpo.className = "flex flex-1 flex-col gap-1.5 p-5";

    const h3 = document.createElement("h3");
    h3.className = "mb-0 text-base font-semibold";
    const enlace = document.createElement("a");
    enlace.className =
      "text-elite-dark no-underline after:absolute after:inset-0 after:content-[''] dark:text-elitenight-dark";
    enlace.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
    enlace.textContent = producto.nombre;
    h3.append(enlace);

    const meta = document.createElement("p");
    meta.className = "m-0 text-sm text-elite-text dark:text-elitenight-text";
    meta.textContent = `${producto.id} · ${producto.presentacion}`;

    cuerpo.append(h3, meta);

    if (producto.novedad) {
      const chip = document.createElement("span");
      chip.className =
        "inline-flex w-fit items-center gap-1 rounded-full border border-elite-border bg-elite-tint px-3 py-0.5 text-xs font-semibold text-elite-dark before:content-['●'] before:text-[0.7em] dark:border-elitenight-border dark:bg-elitenight-tint dark:text-elitenight-dark";
      chip.textContent = "Nuevo ingreso";
      cuerpo.append(chip);
    }

    articulo.append(figura, cuerpo);
    li.append(articulo);
    return li;
  }

  function renderizarProductos() {
    rejilla.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    productos.forEach((producto) => fragmento.append(crearTarjeta(producto)));
    rejilla.append(fragmento);
    rejilla.removeAttribute("aria-busy");
  }

  function categoriasSeleccionadas() {
    return Array.from(fieldsetCategoria.querySelectorAll("input:checked")).map(
      (input) => input.value
    );
  }

  function aplicarFiltros() {
    const seleccionadas = categoriasSeleccionadas();
    const termino = normalizar(buscador.value.trim());
    let visibles = 0;

    rejilla.querySelectorAll(".tarjeta-producto").forEach((tarjeta) => {
      const coincideCategoria =
        seleccionadas.length === 0 || seleccionadas.includes(tarjeta.dataset.categoria);
      const coincideBusqueda = termino === "" || tarjeta.dataset.buscable.includes(termino);
      const visible = coincideCategoria && coincideBusqueda;
      tarjeta.closest("li").hidden = !visible;
      if (visible) visibles += 1;
    });

    contador.textContent =
      visibles === 1 ? "1 producto encontrado" : `${visibles} productos encontrados`;
    sinResultados.hidden = visibles !== 0;
  }

  function limpiarFiltros() {
    fieldsetCategoria.querySelectorAll("input:checked").forEach((input) => {
      input.checked = false;
    });
    buscador.value = "";
    aplicarFiltros();
    buscador.focus();
  }

  function iniciar(datos) {
    productos = datos.productos;
    categorias = datos.categorias;

    crearFiltrosCategoria();
    renderizarProductos();
    aplicarFiltros();

    fieldsetCategoria.addEventListener("change", aplicarFiltros);
    buscador.addEventListener("input", aplicarFiltros);
    botonLimpiar.addEventListener("click", limpiarFiltros);
    botonLimpiarAlterno?.addEventListener("click", limpiarFiltros);
  }

  fetch("data/catalogo.json")
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then(iniciar)
    .catch((error) => {
      console.error("No se pudo cargar el catálogo:", error);
      contador.textContent = "";
      rejilla.hidden = true;
      errorCarga.hidden = false;
    });
})();
