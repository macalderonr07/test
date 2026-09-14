(() => {
  "use strict";

  /* ===== Menú móvil ===== */
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.getElementById("main-menu");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const form = document.getElementById("form-alistamiento");
  if (!form) return;

  /* ===== Fechas dinámicas (siguen siendo validadas por el navegador) ===== */
  const hoy = new Date();

  const fechaNacimiento = form.elements["fecha_nacimiento"];
  if (fechaNacimiento) {
    const edadMinima = new Date(hoy.getFullYear() - 16, hoy.getMonth(), hoy.getDate());
    const fechaMinima = new Date(hoy.getFullYear() - 100, hoy.getMonth(), hoy.getDate());
    fechaNacimiento.max = edadMinima.toISOString().slice(0, 10);
    fechaNacimiento.min = fechaMinima.toISOString().slice(0, 10);
  }

  const fechaEntrevista = form.elements["fecha_entrevista"];
  if (fechaEntrevista) {
    const ahoraLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000);
    fechaEntrevista.min = ahoraLocal.toISOString().slice(0, 16);
  }

  /* ===== Mostrar / ocultar contraseña ===== */
  form.querySelectorAll(".toggle-password").forEach((boton) => {
    boton.addEventListener("click", () => {
      const targetId = boton.getAttribute("data-target");
      const campo = document.getElementById(targetId);
      if (!campo) return;

      const oculto = campo.type === "password";
      campo.type = oculto ? "text" : "password";
      boton.setAttribute("aria-pressed", String(oculto));
      boton.querySelector(".toggle-text").textContent = oculto ? "Ocultar" : "Mostrar";
    });
  });

  /* ===== Salida en vivo del range de sincronización ===== */
  const rango = form.elements["sincronizacion"];
  const rangoSalida = document.getElementById("sincronizacion-valor");
  if (rango && rangoSalida) {
    const actualizarSalida = () => {
      rangoSalida.textContent = `${rango.value}%`;
    };
    rango.addEventListener("input", actualizarSalida);
    actualizarSalida();
  }

  /* ===== Contador de caracteres para la carta de motivación ===== */
  const motivacion = form.elements["motivacion"];
  const contador = document.getElementById("motivacion-contador");
  if (motivacion && contador) {
    const actualizarContador = () => {
      const restantes = motivacion.maxLength - motivacion.value.length;
      contador.textContent = `${restantes} caracteres restantes`;
    };
    motivacion.addEventListener("input", actualizarContador);
    actualizarContador();
  }

  /* ===== Confirmación de contraseña vía Constraint Validation API ===== */
  const clave = form.elements["clave"];
  const claveConfirmar = form.elements["clave_confirmar"];
  if (clave && claveConfirmar) {
    const validarCoincidencia = () => {
      if (claveConfirmar.value && claveConfirmar.value !== clave.value) {
        claveConfirmar.setCustomValidity("Las contraseñas no coinciden.");
      } else {
        claveConfirmar.setCustomValidity("");
      }
    };
    clave.addEventListener("input", validarCoincidencia);
    claveConfirmar.addEventListener("input", validarCoincidencia);
  }

  /* ===== aria-invalid en sincronía con la validez nativa (WCAG 3.3.1) ===== */
  const camposValidables = form.querySelectorAll("input, select, textarea");
  camposValidables.forEach((campo) => {
    const sincronizarAriaInvalid = () => {
      campo.setAttribute("aria-invalid", String(!campo.validity.valid));
    };
    campo.addEventListener("input", sincronizarAriaInvalid);
    campo.addEventListener("blur", sincronizarAriaInvalid);
    campo.addEventListener("invalid", sincronizarAriaInvalid);
  });

  /* ===== Datos de las unidades para el carnet de piloto ===== */
  const UNIDADES = {
    "mazinger-z": {
      nombre: "Mazinger Z",
      pilotoCanonico: "Kouji Kabuto",
      laboratorio: "Instituto de Energía Fotónica (Dr. Kabuto)",
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Mazinger-z-logo-official2.png",
    },
    "great-mazinger": {
      nombre: "Great Mazinger",
      pilotoCanonico: "Tetsuya Tsurugi",
      laboratorio: "Instituto de Energía Fotónica — División de Combate Avanzado",
      logo: null,
    },
    grendizer: {
      nombre: "UFO Robot Grendizer",
      pilotoCanonico: "Duke Fleed",
      laboratorio: "Laboratorio de Energía Fotónica del Dr. Umon",
      logo: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Ufo-robo-grendizer-logo.png",
    },
    "getter-robo": {
      nombre: "Getter Robo",
      pilotoCanonico: "Ryoma Nagare, Hayato Jin y Musashi Tomoe",
      laboratorio: "Instituto de Investigación Saotome",
      logo: null,
    },
    mazinkaiser: {
      nombre: "Mazinkaiser",
      pilotoCanonico: "Kouji Kabuto",
      laboratorio: "Instituto Fotón — Programa Mazinkaiser",
      logo: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Mazinkaiser.png",
    },
  };

  /* ===== Carnet de piloto (resultado del simulador) ===== */
  const carnetResultado = document.getElementById("carnet-resultado");
  const carnetTitulo = document.getElementById("carnet-titulo");
  const carnetFotoPiloto = document.getElementById("carnet-foto-piloto");
  const carnetFotoPlaceholder = document.getElementById("carnet-foto-placeholder");
  const carnetNombre = document.getElementById("carnet-nombre");
  const carnetRango = document.getElementById("carnet-rango");
  const carnetClase = document.getElementById("carnet-clase");
  const carnetLaboratorio = document.getElementById("carnet-laboratorio");
  const carnetMechaLogo = document.getElementById("carnet-mecha-logo");
  const carnetMechaPlaceholder = document.getElementById("carnet-mecha-placeholder");
  const carnetMechaNombre = document.getElementById("carnet-mecha-nombre");
  const carnetMechaPiloto = document.getElementById("carnet-mecha-piloto");
  const carnetId = document.getElementById("carnet-id");

  function textoOpcionSeleccionada(select) {
    if (!select || select.selectedIndex < 0) return "—";
    return select.options[select.selectedIndex].textContent.trim();
  }

  function etiquetaRadioMarcado(nombreCampo) {
    const marcado = form.querySelector(`input[name="${nombreCampo}"]:checked`);
    if (!marcado) return "—";
    const etiqueta = form.querySelector(`label[for="${marcado.id}"]`);
    return etiqueta ? etiqueta.textContent.trim() : marcado.value;
  }

  function mostrarCarnet() {
    if (!carnetResultado) return;

    const unidadSeleccionada = form.querySelector('input[name="unidad_elegida"]:checked');
    const unidad = unidadSeleccionada ? UNIDADES[unidadSeleccionada.value] : null;

    if (carnetNombre) carnetNombre.textContent = form.elements["nombre"].value || "—";
    if (carnetRango) carnetRango.textContent = textoOpcionSeleccionada(form.elements["rango"]);
    if (carnetClase) carnetClase.textContent = etiquetaRadioMarcado("clase_piloto");
    if (carnetLaboratorio) carnetLaboratorio.textContent = unidad ? unidad.laboratorio : "—";
    if (carnetMechaNombre) carnetMechaNombre.textContent = unidad ? unidad.nombre : "—";
    if (carnetMechaPiloto) carnetMechaPiloto.textContent = unidad ? unidad.pilotoCanonico : "—";

    if (carnetMechaLogo && carnetMechaPlaceholder) {
      if (unidad && unidad.logo) {
        carnetMechaLogo.src = unidad.logo;
        carnetMechaLogo.alt = `Logotipo oficial de ${unidad.nombre}`;
        carnetMechaLogo.hidden = false;
        carnetMechaPlaceholder.hidden = true;
      } else {
        carnetMechaLogo.hidden = true;
        carnetMechaPlaceholder.hidden = false;
        carnetMechaPlaceholder.textContent = "Sin imagen oficial disponible";
      }
    }

    const foto = form.elements["foto"];
    const archivo = foto && foto.files && foto.files[0];
    if (carnetFotoPiloto && carnetFotoPlaceholder) {
      if (archivo) {
        const lector = new FileReader();
        lector.onload = () => {
          carnetFotoPiloto.src = lector.result;
          carnetFotoPiloto.hidden = false;
          carnetFotoPlaceholder.hidden = true;
        };
        lector.readAsDataURL(archivo);
      } else {
        carnetFotoPiloto.hidden = true;
        carnetFotoPlaceholder.hidden = false;
      }
    }

    if (carnetId) {
      const folio = Math.floor(Math.random() * 90000 + 10000);
      carnetId.textContent = `Folio de simulación N.º ${folio} · Academia Nagai`;
    }

    carnetResultado.hidden = false;
    if (carnetTitulo) carnetTitulo.focus();
  }

  /* ===== Mensaje de estado accesible al enviar ===== */
  const estado = document.getElementById("form-status");

  form.addEventListener("submit", (evento) => {
    if (!form.checkValidity()) {
      evento.preventDefault();
      if (estado) {
        estado.textContent = "Revisa los campos marcados: hay datos obligatorios o con formato incorrecto.";
      }
      if (carnetResultado) carnetResultado.hidden = true;
      return;
    }

    evento.preventDefault();
    if (estado) {
      estado.textContent = "Simulación completada. Revisa tu carnet de piloto abajo.";
    }

    mostrarCarnet();

    form.reset();
    if (rango && rangoSalida) {
      rangoSalida.textContent = `${rango.value}%`;
    }
    if (motivacion && contador) {
      contador.textContent = `${motivacion.maxLength} caracteres restantes`;
    }
  });
})();
