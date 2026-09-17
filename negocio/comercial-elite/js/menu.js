// Menú móvil accesible: botón con aria-expanded/aria-controls (WCAG 4.1.2)
(() => {
  const boton = document.getElementById("botonMenu");
  const lista = document.getElementById("listaNav");

  if (!boton || !lista) return;

  const cerrarMenu = () => {
    lista.classList.remove("esta-abierta");
    boton.setAttribute("aria-expanded", "false");
  };

  const abrirMenu = () => {
    lista.classList.add("esta-abierta");
    boton.setAttribute("aria-expanded", "true");
  };

  boton.addEventListener("click", () => {
    const estaAbierto = boton.getAttribute("aria-expanded") === "true";
    estaAbierto ? cerrarMenu() : abrirMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && boton.getAttribute("aria-expanded") === "true") {
      cerrarMenu();
      boton.focus();
    }
  });

  document.addEventListener("click", (evento) => {
    const clicFuera = !lista.contains(evento.target) && !boton.contains(evento.target);
    if (clicFuera && boton.getAttribute("aria-expanded") === "true") {
      cerrarMenu();
    }
  });

  const consultaEscritorio = window.matchMedia("(min-width: 48em)");
  const alCambiarAncho = (consulta) => {
    if (consulta.matches) cerrarMenu();
  };
  consultaEscritorio.addEventListener
    ? consultaEscritorio.addEventListener("change", alCambiarAncho)
    : consultaEscritorio.addListener(alCambiarAncho);
})();
