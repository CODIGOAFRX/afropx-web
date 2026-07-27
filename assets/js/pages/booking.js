import { track } from "../core/analytics.js";

const app = document.querySelector("[data-booking-app]");
const globalStatus = document.querySelector("[data-booking-status]");
const progressItems = [...document.querySelectorAll("[data-booking-progress]")];
const steps = [...document.querySelectorAll("[data-booking-step]")];
const serviceGrid = document.querySelector("[data-booking-services]");
const calendarGrid = document.querySelector("[data-booking-calendar]");
const monthLabel = document.querySelector("[data-booking-month]");
const slotGrid = document.querySelector("[data-booking-slots]");
const selectedDateLabel = document.querySelector("[data-selected-date]");
const detailsForm = document.querySelector("[data-booking-details]");
const summary = document.querySelector("[data-booking-summary]");
const submitButton = document.querySelector("[data-booking-submit]");
const successPanel = document.querySelector("[data-booking-success]");
const turnstileContainer = document.querySelector("[data-turnstile]");
const confirmationCheckbox = document.querySelector(
  "[data-booking-confirmation]"
);

const state = {
  config: null,
  service: null,
  month: "",
  availability: null,
  date: "",
  time: "",
  step: 1,
  started: false,
  completed: false,
  clientRequestId: crypto.randomUUID(),
  turnstileToken: "",
  turnstileWidgetId: null
};

function setGlobalStatus(message, kind = "") {
  globalStatus.textContent = message;
  globalStatus.dataset.kind = kind;
}

function setBusy(busy) {
  app.toggleAttribute("aria-busy", busy);
}

function monthFromDate(date) {
  return date.slice(0, 7);
}

function addMonths(month, amount) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

function monthDistance(first, second) {
  const [firstYear, firstMonth] = first.split("-").map(Number);
  const [secondYear, secondMonth] = second.split("-").map(Number);
  return (secondYear - firstYear) * 12 + (secondMonth - firstMonth);
}

function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function goToStep(step) {
  state.step = step;
  steps.forEach((section) => {
    const active = Number(section.dataset.bookingStep) === step;
    section.hidden = !active;
    section.toggleAttribute("aria-current", active);
  });
  progressItems.forEach((item) => {
    const itemStep = Number(item.dataset.bookingProgress);
    item.dataset.state =
      itemStep === step ? "active" : itemStep < step ? "complete" : "upcoming";
    if (itemStep === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });

  const current = steps.find(
    (section) => Number(section.dataset.bookingStep) === step
  );
  current?.querySelector("h2, h3")?.focus({ preventScroll: true });
  current?.scrollIntoView({ behavior: "smooth", block: "start" });
  track("booking_step", String(step));
}

function serviceCard(service) {
  const label = document.createElement("label");
  label.className = "booking-service";
  label.innerHTML = `
    <input type="radio" name="booking-service" value="${service.id}">
    <span class="booking-service-index" aria-hidden="true"></span>
    <span class="booking-service-copy">
      <strong></strong>
      <em></em>
      <small></small>
      <span class="booking-service-includes"></span>
    </span>
  `;
  label.querySelector(".booking-service-index").textContent = String(
    state.config.services.indexOf(service) + 1
  ).padStart(2, "0");
  label.querySelector("strong").textContent = service.name;
  label.querySelector("em").textContent = service.priceLabel;
  label.querySelector("small").textContent = service.durationLabel;
  const includes = label.querySelector(".booking-service-includes");
  service.includes.forEach((item) => {
    const span = document.createElement("span");
    span.textContent = item;
    includes.append(span);
  });
  const input = label.querySelector("input");
  input.addEventListener("change", () => {
    state.service = service;
    state.started = true;
    state.date = "";
    state.time = "";
    state.availability = null;
    document.querySelector("[data-service-next]").disabled = false;
    setGlobalStatus(`${service.name} seleccionado.`, "success");
    track("booking_start", service.id);
  });
  return label;
}

function renderServices() {
  serviceGrid.replaceChildren(
    ...state.config.services.map((service) => serviceCard(service))
  );

  const requestedService = new URLSearchParams(window.location.search).get(
    "service"
  );
  const service = state.config.services.find(
    (candidate) => candidate.id === requestedService
  );
  if (service) {
    const input = serviceGrid.querySelector(
      `input[value="${CSS.escape(service.id)}"]`
    );
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers
    },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : {
        ok: false,
        error: {
          code: "UNEXPECTED_RESPONSE",
          message: "El servidor de reservas no está disponible."
        }
      };
  if (!response.ok) {
    const error = new Error(
      payload.error?.message || "No se ha podido completar la operación."
    );
    error.code = payload.error?.code;
    error.fields = payload.error?.fields;
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadAvailability() {
  if (!state.service || !state.month) return;
  setBusy(true);
  setGlobalStatus("Consultando las horas disponibles…");
  calendarGrid.innerHTML =
    '<div class="booking-skeleton" aria-hidden="true"></div>';
  try {
    const payload = await fetchJson(
      `/api/booking/availability?month=${encodeURIComponent(
        state.month
      )}&service=${encodeURIComponent(state.service.id)}`
    );
    state.availability = payload;
    renderCalendar();
    setGlobalStatus(
      "Calendario actualizado en horario de Madrid.",
      "success"
    );
  } catch (error) {
    state.availability = null;
    calendarGrid.innerHTML = `<p class="booking-inline-error">${escapeText(
      error.message
    )}</p>`;
    setGlobalStatus(error.message, "error");
  } finally {
    setBusy(false);
  }
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = String(value || "");
  return span.innerHTML;
}

function renderCalendar() {
  monthLabel.textContent = formatMonth(state.month);
  calendarGrid.replaceChildren();
  const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
  weekdays.forEach((weekday) => {
    const header = document.createElement("span");
    header.className = "calendar-weekday";
    header.textContent = weekday;
    header.setAttribute("aria-hidden", "true");
    calendarGrid.append(header);
  });

  const [year, month] = state.month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (firstDay + 6) % 7;
  for (let index = 0; index < mondayOffset; index += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    spacer.setAttribute("aria-hidden", "true");
    calendarGrid.append(spacer);
  }

  state.availability.days.forEach((day) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(Number(day.date.slice(-2)));
    button.disabled = !day.available;
    button.dataset.available = String(day.available);
    button.dataset.selected = String(day.date === state.date);
    button.setAttribute(
      "aria-label",
      `${formatDate(day.date)}${
        day.available
          ? `, ${day.slots.length} horas disponibles`
          : ", no disponible"
      }`
    );
    if (day.date === state.date) button.setAttribute("aria-pressed", "true");
    button.addEventListener("click", () => {
      state.date = day.date;
      state.time = "";
      renderCalendar();
      document.querySelector("[data-date-next]").disabled = false;
      setGlobalStatus(`${formatDate(day.date)} seleccionado.`, "success");
    });
    calendarGrid.append(button);
  });

  const baseMonth = monthFromDate(state.config.today);
  const distance = monthDistance(baseMonth, state.month);
  document.querySelector("[data-month-prev]").disabled = distance <= 0;
  document.querySelector("[data-month-next]").disabled =
    distance >= state.config.settings.maxMonthsAhead - 1;
}

function renderSlots() {
  const day = state.availability?.days.find(
    (candidate) => candidate.date === state.date
  );
  selectedDateLabel.textContent = state.date ? formatDate(state.date) : "";
  slotGrid.replaceChildren();

  if (!day?.slots.length) {
    slotGrid.innerHTML =
      '<p class="booking-inline-error">No quedan horas disponibles para ese día. Vuelve al calendario.</p>';
    return;
  }

  day.slots.forEach((time) => {
    const label = document.createElement("label");
    label.className = "booking-slot";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "booking-time";
    input.value = time;
    input.checked = time === state.time;
    input.addEventListener("change", () => {
      state.time = time;
      document.querySelector("[data-time-next]").disabled = false;
      setGlobalStatus(`${time}, hora de Madrid, seleccionada.`, "success");
    });
    const text = document.createElement("span");
    text.textContent = time;
    label.append(input, text);
    slotGrid.append(label);
  });
}

function clearFieldErrors() {
  detailsForm
    .querySelectorAll("[aria-invalid='true']")
    .forEach((field) => field.removeAttribute("aria-invalid"));
  detailsForm
    .querySelectorAll("[data-field-error]")
    .forEach((element) => (element.textContent = ""));
}

function showFieldErrors(fields = {}) {
  clearFieldErrors();
  Object.entries(fields).forEach(([name, message]) => {
    const field = detailsForm.elements.namedItem(name);
    if (field instanceof RadioNodeList) return;
    field?.setAttribute("aria-invalid", "true");
    const error = detailsForm.querySelector(
      `[data-field-error="${CSS.escape(name)}"]`
    );
    if (error) error.textContent = message;
  });
  const firstInvalid = detailsForm.querySelector("[aria-invalid='true']");
  firstInvalid?.focus();
}

function getDetails() {
  const data = new FormData(detailsForm);
  return {
    customerName: String(data.get("customerName") || "").trim(),
    customerEmail: String(data.get("customerEmail") || "").trim(),
    customerPhone: String(data.get("customerPhone") || "").trim(),
    artistName: String(data.get("artistName") || "").trim(),
    songCount: String(data.get("songCount") || "").trim(),
    filesUrl: String(data.get("filesUrl") || "").trim(),
    projectNotes: String(data.get("projectNotes") || "").trim(),
    privacyAccepted: data.get("privacyAccepted") === "on",
    marketingConsent: data.get("marketingConsent") === "on"
  };
}

function validateDetails() {
  clearFieldErrors();
  if (!detailsForm.checkValidity()) {
    const firstInvalid = detailsForm.querySelector(":invalid");
    firstInvalid?.focus();
    detailsForm.reportValidity();
    return false;
  }
  return true;
}

function renderSummary() {
  const details = getDetails();
  const rows = [
    ["Servicio", state.service.name],
    ["Precio", state.service.priceLabel],
    ["Fecha", formatDate(state.date)],
    ["Hora", `${state.time} · Europe/Madrid`],
    ["Nombre", details.customerName],
    ["Correo", details.customerEmail],
    ["Teléfono / WhatsApp", details.customerPhone],
    ...(details.artistName ? [["Nombre artístico", details.artistName]] : []),
    ...(details.songCount ? [["Canciones / pistas", details.songCount]] : [])
  ];
  summary.replaceChildren(
    ...rows.flatMap(([term, value]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      return [dt, dd];
    })
  );
  confirmationCheckbox.checked = false;
  submitButton.disabled = true;
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

async function initializeTurnstile() {
  if (state.config.turnstile.bypass) {
    state.turnstileToken = "development-bypass";
    turnstileContainer.textContent =
      "Comprobación anti-spam omitida en desarrollo local.";
    return;
  }
  if (!state.config.turnstile.siteKey) {
    turnstileContainer.textContent =
      "La comprobación anti-spam todavía no está configurada.";
    return;
  }

  try {
    await loadTurnstileScript();
    state.turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: state.config.turnstile.siteKey,
      action: "booking",
      theme: "dark",
      callback: (token) => {
        state.turnstileToken = token;
        setGlobalStatus("Comprobación anti-spam completada.", "success");
      },
      "expired-callback": () => {
        state.turnstileToken = "";
        setGlobalStatus(
          "La comprobación anti-spam ha caducado. Complétala de nuevo.",
          "warning"
        );
      },
      "error-callback": () => {
        state.turnstileToken = "";
        setGlobalStatus(
          "No se ha podido cargar la comprobación anti-spam.",
          "error"
        );
      }
    });
  } catch {
    turnstileContainer.textContent =
      "No se ha podido cargar la comprobación anti-spam.";
  }
}

async function submitBooking() {
  if (!confirmationCheckbox.checked) return;
  if (!state.turnstileToken) {
    setGlobalStatus("Completa la comprobación anti-spam.", "error");
    turnstileContainer.focus();
    return;
  }

  submitButton.disabled = true;
  setBusy(true);
  setGlobalStatus("Guardando tu solicitud…");
  const details = getDetails();
  const payload = {
    clientRequestId: state.clientRequestId,
    serviceId: state.service.id,
    localDate: state.date,
    localTime: state.time,
    ...details,
    songCount: details.songCount ? Number(details.songCount) : null,
    turnstileToken: state.turnstileToken
  };

  try {
    const result = await fetchJson("/api/booking", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.completed = true;
    steps.forEach((step) => (step.hidden = true));
    progressItems.forEach((item) => (item.dataset.state = "complete"));
    successPanel.hidden = false;
    successPanel.querySelector("[data-success-id]").textContent =
      result.booking.id;
    successPanel.querySelector("[data-success-service]").textContent =
      result.booking.serviceName;
    successPanel.querySelector("[data-success-date]").textContent =
      `${formatDate(result.booking.date)} · ${result.booking.time}`;
    successPanel.querySelector("[data-success-price]").textContent =
      result.booking.priceLabel;
    successPanel.querySelector("[data-success-email-note]").textContent =
      result.booking.email.customer === "sent"
        ? "También te hemos enviado un correo de recepción."
        : "La solicitud está guardada. Si no recibes correo, conserva este identificador.";
    setGlobalStatus("Solicitud guardada correctamente.", "success");
    successPanel.focus();
    track("booking_complete", state.service.id);
  } catch (error) {
    track("booking_error", error.code || "unknown");
    setGlobalStatus(error.message, "error");
    if (error.code === "SLOT_UNAVAILABLE") {
      state.time = "";
      await loadAvailability();
      renderSlots();
      goToStep(3);
    } else if (error.code === "VALIDATION_ERROR" && error.fields) {
      showFieldErrors(error.fields);
      goToStep(4);
    } else if (
      !state.config.turnstile.bypass &&
      state.turnstileWidgetId != null &&
      window.turnstile
    ) {
      state.turnstileToken = "";
      window.turnstile.reset(state.turnstileWidgetId);
    }
    submitButton.disabled = !confirmationCheckbox.checked;
  } finally {
    setBusy(false);
  }
}

document.querySelector("[data-service-next]")?.addEventListener("click", () => {
  if (!state.service) return;
  state.month = monthFromDate(state.config.today);
  goToStep(2);
  loadAvailability();
});

document.querySelector("[data-date-next]")?.addEventListener("click", () => {
  if (!state.date) return;
  renderSlots();
  goToStep(3);
});

document.querySelector("[data-time-next]")?.addEventListener("click", () => {
  if (!state.time) return;
  goToStep(4);
});

document.querySelector("[data-details-next]")?.addEventListener("click", () => {
  if (!validateDetails()) return;
  renderSummary();
  goToStep(5);
});

document.querySelectorAll("[data-booking-back]").forEach((button) => {
  button.addEventListener("click", () => {
    goToStep(Number(button.dataset.bookingBack));
  });
});

document.querySelector("[data-month-prev]")?.addEventListener("click", () => {
  state.month = addMonths(state.month, -1);
  state.date = "";
  state.time = "";
  document.querySelector("[data-date-next]").disabled = true;
  loadAvailability();
});

document.querySelector("[data-month-next]")?.addEventListener("click", () => {
  state.month = addMonths(state.month, 1);
  state.date = "";
  state.time = "";
  document.querySelector("[data-date-next]").disabled = true;
  loadAvailability();
});

confirmationCheckbox?.addEventListener("change", () => {
  submitButton.disabled =
    !confirmationCheckbox.checked || !state.config?.ready;
});
submitButton?.addEventListener("click", submitBooking);

window.addEventListener("beforeunload", () => {
  if (state.started && !state.completed) {
    track("booking_abandon", String(state.step));
  }
});

async function start() {
  setBusy(true);
  try {
    const payload = await fetchJson("/api/booking/config");
    state.config = payload;
    renderServices();
    await initializeTurnstile();
    if (payload.ready) {
      setGlobalStatus(
        state.service
          ? `${state.service.name} seleccionado. Los horarios se muestran en hora de Madrid.`
          : "Elige un servicio para comenzar. Los horarios se muestran en hora de Madrid.",
        "success"
      );
    } else {
      setGlobalStatus(
        payload.warnings?.join(" ") ||
          "El sistema de reservas todavía no está configurado.",
        "warning"
      );
      app.dataset.ready = "false";
      serviceGrid
        .querySelectorAll("input")
        .forEach((input) => (input.disabled = true));
    }
  } catch (error) {
    setGlobalStatus(
      "El sistema de reservas no está disponible en este despliegue. Puedes contactar por correo o teléfono.",
      "error"
    );
    app.dataset.ready = "false";
    serviceGrid.innerHTML =
      '<p class="booking-inline-error">Las reservas online están temporalmente fuera de servicio. Puedes contactar por correo o teléfono.</p>';
  } finally {
    setBusy(false);
  }
}

start();
