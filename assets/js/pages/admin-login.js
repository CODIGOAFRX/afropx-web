const form = document.querySelector("[data-admin-login-form]");
const status = document.querySelector("[data-admin-login-status]");
const denied = document.querySelector("[data-admin-denied]");
const card = document.querySelector(".admin-login-card");
const passwordInput = document.querySelector("#admin-password");

function safeNextPath() {
  const candidate = new URLSearchParams(location.search).get("next") || "";
  return candidate.startsWith("/admin/") && !candidate.startsWith("//")
    ? candidate
    : "/admin/";
}

function showDenied() {
  card.hidden = true;
  denied.hidden = false;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = form.querySelector("button[type='submit']");
  status.textContent = "Comprobando acceso…";
  status.dataset.kind = "";
  submit.disabled = true;

  try {
    const response = await fetch("/api/admin-session/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: passwordInput.value })
    });
    const payload = await response.json();
    passwordInput.value = "";

    if (response.status === 403) {
      showDenied();
      return;
    }
    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          "No se ha podido comprobar el acceso. Inténtalo de nuevo."
      );
    }
    location.replace(safeNextPath());
  } catch (error) {
    status.textContent = error.message;
    status.dataset.kind = "error";
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("[data-admin-retry]")?.addEventListener("click", () => {
  denied.hidden = true;
  card.hidden = false;
  status.textContent = "";
  passwordInput.focus();
});
