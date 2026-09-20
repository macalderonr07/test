// Formulario de cotización: validación con regex en el navegador y envío
// vía mailto (sitio sin backend, RF-08). Errores en texto junto al campo,
// enlazados con aria-describedby (WCAG 3.3.1 / 3.3.2). El estado inválido se
// refleja alternando utilidades de color de Tailwind sobre el propio campo,
// en vez del selector CSS ".campo[data-invalido] input" de la versión vanilla.
(() => {
  const formulario = document.getElementById("formularioContacto");
  if (!formulario) return;

  const CORREO_VENTAS = "ventas@comercialelite.com";

  const patrones = {
    nombre: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,80}$/,
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    telefono: /^[0-9]{7,10}$/,
    mensaje: /^.{5,600}$/s,
  };

  const mensajesError = {
    nombre: "Escribe tu nombre completo (solo letras, mínimo 2 caracteres).",
    correo: "Escribe un correo válido, por ejemplo nombre@empresa.com.",
    telefono: "El teléfono debe tener entre 7 y 10 dígitos, solo números.",
    mensaje: "Cuéntanos brevemente qué producto o línea te interesa.",
  };

  const CLASES_INVALIDO = ["border-error", "bg-error-tint", "dark:border-error-dark", "dark:bg-error-darktint"];
  const CLASES_VALIDO = ["border-elite-border", "dark:border-elitenight-border"];

  const estadoFormulario = document.getElementById("estadoFormulario");
  const CLASES_ESTADO_OK = ["border-elite-dark", "bg-elite-tint", "dark:border-elitenight-dark", "dark:bg-elitenight-tint"];
  const CLASES_ESTADO_ERROR = ["border-error", "bg-error-tint", "dark:border-error-dark", "dark:bg-error-darktint"];

  function validarCampo(nombreCampo, opcional = false) {
    const input = document.getElementById(nombreCampo);
    const campo = input.closest(".campo");
    const error = document.getElementById(`error${capitalizar(nombreCampo)}`);
    const valor = input.value.trim();

    if (opcional && valor === "") {
      campo.removeAttribute("data-invalido");
      input.classList.remove(...CLASES_INVALIDO);
      input.classList.add(...CLASES_VALIDO);
      error.textContent = "";
      return true;
    }

    const esValido = patrones[nombreCampo].test(valor);
    if (esValido) {
      campo.removeAttribute("data-invalido");
      input.classList.remove(...CLASES_INVALIDO);
      input.classList.add(...CLASES_VALIDO);
      error.textContent = "";
    } else {
      campo.setAttribute("data-invalido", "");
      input.classList.remove(...CLASES_VALIDO);
      input.classList.add(...CLASES_INVALIDO);
      error.textContent = mensajesError[nombreCampo];
    }
    return esValido;
  }

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  ["nombre", "correo", "mensaje"].forEach((campo) => {
    document.getElementById(campo).addEventListener("blur", () => validarCampo(campo));
  });
  document.getElementById("telefono").addEventListener("blur", () => validarCampo("telefono", true));

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const nombreValido = validarCampo("nombre");
    const correoValido = validarCampo("correo");
    const telefonoValido = validarCampo("telefono", true);
    const mensajeValido = validarCampo("mensaje");

    const todoValido = nombreValido && correoValido && telefonoValido && mensajeValido;

    if (!todoValido) {
      estadoFormulario.hidden = false;
      estadoFormulario.dataset.tipo = "error";
      estadoFormulario.classList.remove(...CLASES_ESTADO_OK);
      estadoFormulario.classList.add(...CLASES_ESTADO_ERROR);
      estadoFormulario.textContent = "Revisa los campos marcados en rojo antes de enviar.";
      formulario.querySelector("[data-invalido] input, [data-invalido] textarea")?.focus();
      return;
    }

    const datos = new FormData(formulario);
    const asunto = encodeURIComponent(`Solicitud de cotización — ${datos.get("nombre")}`);
    const cuerpo = encodeURIComponent(
      `Nombre: ${datos.get("nombre")}\n` +
        `Correo: ${datos.get("correo")}\n` +
        `Teléfono: ${datos.get("telefono") || "No indicado"}\n\n` +
        `Mensaje:\n${datos.get("mensaje")}`
    );

    window.location.href = `mailto:${CORREO_VENTAS}?subject=${asunto}&body=${cuerpo}`;

    estadoFormulario.hidden = false;
    estadoFormulario.dataset.tipo = "exito";
    estadoFormulario.classList.remove(...CLASES_ESTADO_ERROR);
    estadoFormulario.classList.add(...CLASES_ESTADO_OK);
    estadoFormulario.textContent =
      "Se abrió tu cliente de correo con la solicitud lista para enviar. Si prefieres, también puedes escribirnos por WhatsApp.";
    formulario.reset();
  });
})();
