const isLocal =
  location.hostname === "127.0.0.1" || location.hostname === "localhost";
const statusRegion = document.querySelector("[data-admin-status]");
const summaryGrid = document.querySelector("[data-admin-summary]");
const bookingBody = document.querySelector("[data-admin-bookings]");
const filterForm = document.querySelector("[data-admin-filters]");
const dialog = document.querySelector("[data-booking-dialog]");
const dialogBody = document.querySelector("[data-booking-detail]");
const noteField = document.querySelector("[data-booking-note]");
const statusActions = document.querySelector("[data-booking-actions]");
const emailStatus = document.querySelector("[data-email-status]");
const blockForm = document.querySelector("[data-block-form]");
const blockList = document.querySelector("[data-block-list]");
const exceptionForm = document.querySelector("[data-exception-form]");
const exceptionList = document.querySelector("[data-exception-list]");
const settingsForm = document.querySelector("[data-settings-form]");
const weeklyGrid = document.querySelector("[data-weekly-grid]");
const settingsSubmit = document.querySelector("[data-settings-submit]");
const settingsStatus = document.querySelector("[data-settings-status]");

let currentBooking = null;
let settingsState = null;

function showStatus(message, kind = "") {
  statusRegion.textContent = message;
  statusRegion.dataset.kind = kind;
}

function showSettingsStatus(message, kind = "") {
  settingsStatus.textContent = message;
  settingsStatus.dataset.kind = kind;
}

async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (isLocal) headers.set("X-Dev-Admin", "true");
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      const next = encodeURIComponent(
        `${location.pathname}${location.search}`
      );
      location.replace(`/admin/login/?next=${next}`);
    }
    throw new Error(
      payload?.error?.message || `Error del panel (${response.status}).`
    );
  }
  return payload;
}

function cell(value, className = "") {
  const element = document.createElement("td");
  element.className = className;
  element.textContent = value ?? "—";
  return element;
}

function statusLabel(status) {
  return {
    pending: "Pendiente",
    confirmed: "Confirmada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
    completed: "Completada"
  }[status] || status;
}

function renderSummary(payload) {
  const cards = [
    ["Pendientes", payload.counts.pending || 0, "pending"],
    ["Confirmadas", payload.counts.confirmed || 0, "confirmed"],
    ["Próximas", payload.upcoming.length, "upcoming"],
    ["Solicitudes 30 d", payload.analytics30d.booking_complete || 0, "analytics"]
  ];
  summaryGrid.replaceChildren(
    ...cards.map(([label, value, id]) => {
      const article = document.createElement("article");
      article.className = "admin-stat";
      article.dataset.stat = id;
      const strong = document.createElement("strong");
      strong.textContent = value;
      const span = document.createElement("span");
      span.textContent = label;
      article.append(strong, span);
      return article;
    })
  );
}

function renderBookings(payload) {
  bookingBody.replaceChildren();
  if (!payload.bookings.length) {
    const row = document.createElement("tr");
    const empty = cell("No hay reservas con esos filtros.", "admin-empty");
    empty.colSpan = 7;
    row.append(empty);
    bookingBody.append(row);
    return;
  }

  payload.bookings.forEach((booking) => {
    const row = document.createElement("tr");
    row.append(
      cell(`${booking.local_date}\n${booking.local_time}`, "admin-date"),
      cell(booking.id, "admin-id"),
      cell(booking.customer_name),
      cell(booking.service_name),
      cell(booking.price_label),
      cell(statusLabel(booking.status), `status-${booking.status}`)
    );
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-small-button";
    button.textContent = "Abrir";
    button.addEventListener("click", () => openBooking(booking.id));
    action.append(button);
    row.append(action);
    bookingBody.append(row);
  });
}

function detailRow(term, value, options = {}) {
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  if (options.link && value) {
    const anchor = document.createElement("a");
    anchor.href = value;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = value;
    dd.append(anchor);
  } else {
    dd.textContent = value ?? "No indicado";
  }
  wrapper.append(dt, dd);
  return wrapper;
}

function renderBookingDetail(booking, emails) {
  dialog.querySelector("[data-booking-dialog-title]").textContent = booking.id;
  dialogBody.replaceChildren(
    detailRow("Estado", statusLabel(booking.status)),
    detailRow("Servicio", booking.service_name),
    detailRow("Precio", booking.price_label),
    detailRow(
      "Fecha y hora",
      `${booking.local_date} · ${booking.local_time} · ${booking.timezone}`
    ),
    detailRow("Nombre", booking.customer_name),
    detailRow("Correo", booking.customer_email),
    detailRow("Teléfono", booking.customer_phone),
    detailRow("Nombre artístico", booking.artist_name),
    detailRow("Canciones / pistas", booking.song_count),
    detailRow("Archivos", booking.files_url, { link: true }),
    detailRow("Proyecto", booking.project_notes),
    detailRow(
      "Consentimiento promocional",
      booking.marketing_consent ? "Sí" : "No"
    ),
    detailRow(
      "Correos",
      `Cliente: ${booking.customer_email_status} · Interno: ${booking.internal_email_status}`
    ),
    detailRow("Creada", booking.created_at)
  );
  noteField.value = booking.private_notes || "";
  renderStatusActions(booking.status);
  const emailLog = dialog.querySelector("[data-email-log]");
  const latestCustomerEmail = emails.find(
    (email) => email.recipient_type === "customer"
  );
  emailStatus.dataset.kind = latestCustomerEmail?.status || "";
  emailStatus.textContent = latestCustomerEmail
    ? {
        sent: "Último correo al cliente: enviado.",
        failed: `Último correo al cliente: ha fallado${
          latestCustomerEmail.error_code
            ? ` (${latestCustomerEmail.error_code})`
            : ""
        }.`,
        disabled:
          "Correos desactivados: falta configurar el proveedor de envío."
      }[latestCustomerEmail.status] || ""
    : "Todavía no hay intentos de correo al cliente.";
  emailLog.textContent = emails.length
    ? emails
        .map(
          (email) =>
            `${email.created_at} · ${email.recipient_type} · ${email.status}`
        )
        .join("\n")
    : "Sin envíos registrados.";
}

function renderStatusActions(status) {
  const transitions = {
    pending: [
      ["confirmed", "Confirmar"],
      ["rejected", "Rechazar"],
      ["cancelled", "Cancelar"]
    ],
    confirmed: [
      ["completed", "Completar"],
      ["cancelled", "Cancelar"]
    ],
    rejected: [],
    cancelled: [],
    completed: []
  };
  statusActions.replaceChildren(
    ...(transitions[status] || []).map(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `admin-action admin-action-${value}`;
      button.textContent = label;
      button.addEventListener("click", () => updateBooking({ status: value }));
      return button;
    })
  );
}

async function openBooking(id) {
  showStatus(`Abriendo ${id}…`);
  try {
    const payload = await api(`/api/admin/bookings/${encodeURIComponent(id)}`);
    currentBooking = payload.booking;
    renderBookingDetail(payload.booking, payload.emails);
    dialog.showModal();
    showStatus(`${id} abierto.`, "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function updateBooking(changes) {
  if (!currentBooking) return;
  showStatus("Guardando cambios…");
  try {
    const payload = await api(
      `/api/admin/bookings/${encodeURIComponent(currentBooking.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(changes)
      }
    );
    currentBooking = payload.booking;
    const detail = await api(
      `/api/admin/bookings/${encodeURIComponent(currentBooking.id)}`
    );
    renderBookingDetail(detail.booking, detail.emails);
    await refreshBookings();
    await refreshSummary();
    if (changes.status === "confirmed" && payload.delivery) {
      showStatus(
        {
          sent: "Reserva confirmada y correo enviado al cliente.",
          failed:
            "Reserva confirmada, pero el correo ha fallado. Revisa el registro.",
          disabled:
            "Reserva confirmada, pero los correos siguen desactivados."
        }[payload.delivery.status] || "Reserva confirmada.",
        payload.delivery.status === "sent" ? "success" : "error"
      );
    } else {
      showStatus("Reserva actualizada.", "success");
    }
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function refreshBookings() {
  const params = new URLSearchParams(new FormData(filterForm));
  const payload = await api(`/api/admin/bookings?${params.toString()}`);
  renderBookings(payload);
}

async function refreshSummary() {
  renderSummary(await api("/api/admin/summary"));
}

async function refreshBlocks() {
  const payload = await api("/api/admin/blocks");
  blockList.replaceChildren(
    ...payload.blocks.map((block) => {
      const row = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${block.block_date} · ${
        block.start_time
          ? `${block.start_time}–${block.end_time}`
          : "día completo"
      }${block.reason ? ` · ${block.reason}` : ""}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Eliminar";
      button.addEventListener("click", async () => {
        await api(`/api/admin/blocks?id=${encodeURIComponent(block.id)}`, {
          method: "DELETE"
        });
        await refreshBlocks();
        showStatus("Bloqueo eliminado.", "success");
      });
      row.append(text, button);
      return row;
    })
  );
}

async function refreshExceptions() {
  const payload = await api("/api/admin/exceptions");
  exceptionList.replaceChildren(
    ...payload.exceptions.map((exception) => {
      const row = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${exception.exception_date} · ${
        exception.enabled
          ? `${exception.start_time}–${exception.last_start_time}`
          : "cerrado"
      }${exception.reason ? ` · ${exception.reason}` : ""}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Eliminar";
      button.addEventListener("click", async () => {
        await api(
          `/api/admin/exceptions?date=${encodeURIComponent(
            exception.exception_date
          )}`,
          { method: "DELETE" }
        );
        await refreshExceptions();
      });
      row.append(text, button);
      return row;
    })
  );
}

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

function renderSettings(payload) {
  settingsState = payload;
  settingsForm.elements.slotIntervalMinutes.value =
    payload.settings.slotIntervalMinutes;
  settingsForm.elements.defaultDurationMinutes.value =
    payload.settings.defaultDurationMinutes;
  settingsForm.elements.bufferMinutes.value = payload.settings.bufferMinutes;
  settingsForm.elements.maxMonthsAhead.value =
    payload.settings.maxMonthsAhead;
  weeklyGrid.replaceChildren(
    ...payload.availability.map((rule) => {
      const row = document.createElement("div");
      row.className = "weekly-row";
      row.dataset.day = rule.dayOfWeek;
      row.innerHTML = `
        <label class="check-field">
          <input type="checkbox" data-weekly-enabled>
          <span></span>
        </label>
        <strong></strong>
        <label><span>Desde</span><input type="time" data-weekly-start required></label>
        <label><span>Último inicio</span><input type="time" data-weekly-last required></label>
      `;
      row.querySelector("strong").textContent = DAY_LABELS[rule.dayOfWeek];
      row.querySelector("[data-weekly-enabled]").checked = rule.enabled;
      row.querySelector("[data-weekly-start]").value = rule.start;
      row.querySelector("[data-weekly-last]").value = rule.lastStart;
      return row;
    })
  );
}

function getWeeklyValues() {
  return [...weeklyGrid.querySelectorAll(".weekly-row")].map((row) => ({
    dayOfWeek: Number(row.dataset.day),
    enabled: row.querySelector("[data-weekly-enabled]").checked,
    start: row.querySelector("[data-weekly-start]").value,
    lastStart: row.querySelector("[data-weekly-last]").value
  }));
}

filterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await refreshBookings();
    showStatus("Filtros aplicados.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

document.querySelector("[data-admin-refresh]")?.addEventListener("click", () =>
  initialize()
);
document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
  try {
    await fetch("/api/admin-session/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
  } finally {
    location.replace("/admin/login/");
  }
});
document.querySelector("[data-dialog-close]")?.addEventListener("click", () =>
  dialog.close()
);
document.querySelector("[data-save-note]")?.addEventListener("click", () =>
  updateBooking({ privateNotes: noteField.value })
);
document.querySelector("[data-resend-email]")?.addEventListener("click", async () => {
  if (!currentBooking) return;
  showStatus("Reenviando correos…");
  try {
    await api(
      `/api/admin/bookings/${encodeURIComponent(currentBooking.id)}/email`,
      { method: "POST" }
    );
    await openBooking(currentBooking.id);
    showStatus("Correos procesados de nuevo.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

blockForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(blockForm));
  try {
    await api("/api/admin/blocks", {
      method: "POST",
      body: JSON.stringify(data)
    });
    blockForm.reset();
    await refreshBlocks();
    showStatus("Bloqueo creado.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

exceptionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(exceptionForm));
  data.enabled = data.enabled === "on";
  try {
    await api("/api/admin/exceptions", {
      method: "POST",
      body: JSON.stringify(data)
    });
    exceptionForm.reset();
    await refreshExceptions();
    showStatus("Excepción guardada.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!settingsState) return;
  const data = Object.fromEntries(new FormData(settingsForm));
  const payload = {
    slotIntervalMinutes: Number(data.slotIntervalMinutes),
    defaultDurationMinutes: Number(data.defaultDurationMinutes),
    bufferMinutes: Number(data.bufferMinutes),
    maxMonthsAhead: Number(data.maxMonthsAhead),
    availability: getWeeklyValues()
  };
  settingsSubmit.disabled = true;
  settingsSubmit.textContent = "Guardando...";
  showSettingsStatus("Guardando cambios...");
  showStatus("Guardando disponibilidad...");
  try {
    const result = await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    renderSettings(result);
    showSettingsStatus("Guardado correctamente.", "success");
    showStatus("Disponibilidad actualizada.", "success");
  } catch (error) {
    showSettingsStatus(error.message, "error");
    showStatus(error.message, "error");
  } finally {
    settingsSubmit.disabled = false;
    settingsSubmit.textContent = "Guardar disponibilidad";
  }
});

document.querySelector("[data-export-csv]")?.addEventListener("click", async () => {
  showStatus("Preparando CSV…");
  try {
    const headers = isLocal ? { "X-Dev-Admin": "true" } : {};
    const response = await fetch("/api/admin/export", {
      credentials: "same-origin",
      headers
    });
    if (!response.ok) throw new Error("No se ha podido exportar el CSV.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservas-afropx-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2_000);
    showStatus("CSV exportado.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

async function initialize() {
  showStatus("Cargando panel…");
  try {
    const [summary, bookings, blocks, exceptions, settings] =
      await Promise.all([
        api("/api/admin/summary"),
        api("/api/admin/bookings"),
        api("/api/admin/blocks"),
        api("/api/admin/exceptions"),
        api("/api/admin/settings")
      ]);
    renderSummary(summary);
    renderBookings(bookings);
    renderSettings(settings);
    blockList.replaceChildren();
    exceptionList.replaceChildren();
    await Promise.all([refreshBlocks(), refreshExceptions()]);
    showStatus("Panel actualizado.", "success");
  } catch (error) {
    showStatus(error.message, "error");
    document.body.dataset.adminError = "true";
  }
}

initialize();
