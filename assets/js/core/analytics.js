import SITE_CONFIG from "../../../config/site.js";

const endpoint = SITE_CONFIG.analytics.endpoint;
const allowedEvents = new Set(SITE_CONFIG.analytics.allowedEvents);

function trackingAllowed() {
  if (!SITE_CONFIG.analytics.respectDoNotTrack) return true;
  return navigator.doNotTrack !== "1" && window.doNotTrack !== "1";
}

function cleanDimension(value, maxLength) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9/_:.,-]/gu, "")
    .slice(0, maxLength);
}

export function track(event, detail = "") {
  if (!trackingAllowed() || !allowedEvents.has(event)) return;

  const payload = {
    event,
    path: cleanDimension(window.location.pathname, 160) || "/",
    detail: cleanDimension(detail, 100)
  };

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "same-origin"
  }).catch(() => {
    // La analítica nunca debe bloquear la experiencia pública.
  });
}

export function initAnalytics() {
  track("page_view");

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track]");
    if (!target) return;
    track(target.dataset.track, target.dataset.trackDetail || "");
  });
}
