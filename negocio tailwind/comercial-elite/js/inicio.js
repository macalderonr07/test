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
        li.className = "flex flex-wrap items-baseline gap-3 border-b border-elite-border py-2 dark:border-elitenight-border";
        const fecha = formateador.format(new Date(`${producto.fechaIngreso}T00:00:00`));
        li.innerHTML = `
          <time class="font-bold whitespace-nowrap text-elite-dark dark:text-elitenight-dark" datetime="${producto.fechaIngreso}">${fecha}</time>
          <a href="producto.html?id=${encodeURIComponent(producto.id)}">Nuevo ingreso: ${producto.nombre}</a>
        `;
        lista.append(li);
      });
    })
    .catch((error) => {
      console.error("No se pudieron cargar las novedades:", error);
    });
})();
