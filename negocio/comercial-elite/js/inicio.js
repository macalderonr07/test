// Inicio: reemplaza las novedades estáticas por las de data/catalogo.json
// (RF-05, RNF-04). Si falla la carga, se conserva el listado escrito en el
// HTML como contenido de reserva.
(() => {
  const lista = document.getElementById("listaNovedades");
  if (!lista) return;

  const formateador = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  fetch("data/catalogo.json")
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((datos) => {
      const novedades = datos.productos
        .filter((producto) => producto.novedad)
        .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso))
        .slice(0, 3);

      if (novedades.length === 0) return;

      lista.innerHTML = "";
      novedades.forEach((producto) => {
        const li = document.createElement("li");
        const fecha = formateador.format(new Date(`${producto.fechaIngreso}T00:00:00`));
        li.innerHTML = `
          <time datetime="${producto.fechaIngreso}">${fecha}</time>
          <a href="producto.html?id=${encodeURIComponent(producto.id)}">Nuevo ingreso: ${producto.nombre}</a>
        `;
        lista.append(li);
      });
    })
    .catch((error) => {
      console.error("No se pudieron cargar las novedades:", error);
    });
})();
