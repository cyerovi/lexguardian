document.addEventListener("DOMContentLoaded", function () {
  // Establecer prefijo del país por defecto
  document.getElementById("telefono").value = "+593 ";

  // Validación de email
  document.getElementById("email").addEventListener("blur", function () {
    if (!this.value.includes("@")) {
      alert("Por favor, ingrese un correo electrónico válido");
      this.focus();
    }
  });

  // Validación de teléfono
  document.getElementById("telefono").addEventListener("blur", function () {
    let numero = this.value.replace(/\D/g, "");
    if (numero.length !== 10) {
      alert("El número de teléfono debe tener 10 dígitos");
      this.focus();
    }
  });

  // Envío del formulario
  const formData = {
    email: document.getElementById("email").value,
    telefono: document.getElementById("telefono").value,
  };

  fetch("process.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(formData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error al procesar el formulario. Por favor, intente nuevamente.");
    });
});

// Helper to show lightweight inline errors without breaking flow
function mostrarError(mensaje) {
  try {
    const container = document.querySelector(".container") || document.body;
    const id = "form-error-banner";
    let banner = document.getElementById(id);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = id;
      banner.style.cssText = "margin:12px 0;padding:10px 14px;border:1px solid #ef4444;background:#fee2e2;color:#991b1b;border-radius:8px;font-weight:600;";
      container.prepend(banner);
    }
    banner.textContent = mensaje;
    setTimeout(() => {
      if (banner && banner.parentElement) banner.parentElement.removeChild(banner);
    }, 4000);
  } catch (_e) {
    alert(mensaje);
  }
}

// En validacion.js - Validar el formulario de registro
function validarFormulario() {
  const email = document.getElementById("email").value;
  const nombre = document.getElementById("nombre").value;
  const empresa = document.getElementById("empresa").value;

  // Validar campos
  if (!email || !nombre || !empresa) {
    mostrarError("Todos los campos son obligatorios");
    return false;
  }

  // Validar formato de email
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    mostrarError("Email no válido");
    return false;
  }

  // Guardar datos
  localStorage.setItem(
    "usuarioData",
    JSON.stringify({
      email,
      nombre,
      empresa,
      fechaRegistro: new Date().toISOString(),
    })
  );

  return true;
}
