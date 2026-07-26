import SITE_CONFIG, { getFeaturedRelease } from "../../../config/site.js";
import { track } from "../core/analytics.js";
import {
  canvasToBlob,
  contrastRatio,
  downloadBlob,
  makeQrSvg,
  renderQrCanvas,
  safeFileName,
  validateHttpUrl
} from "../core/qr-engine.js";

const form = document.querySelector("[data-qr-form]");
const canvas = document.querySelector("[data-qr-canvas]");
const status = document.querySelector("[data-qr-status]");
const contrastNotice = document.querySelector("[data-qr-contrast]");
const pngButton = document.querySelector("[data-qr-download-png]");
const svgButton = document.querySelector("[data-qr-download-svg]");
const cardButton = document.querySelector("[data-qr-to-card]");
const logoInput = document.querySelector("[data-qr-logo]");

let logoDataUrl = "";
let renderTimer = 0;
let lastSettings = null;

function values() {
  const data = new FormData(form);
  return {
    url: String(data.get("url") || "").trim(),
    size: Number(data.get("size") || 800),
    margin: Number(data.get("margin") || 4),
    errorCorrection: String(data.get("errorCorrection") || "H"),
    foreground: String(data.get("foreground") || "#050505"),
    background: String(data.get("background") || "#ffffff"),
    transparent: data.get("transparent") === "on",
    logoDataUrl
  };
}

function showStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

async function render() {
  const settings = values();
  const validation = validateHttpUrl(settings.url);
  if (!validation.valid) {
    showStatus(validation.message, "error");
    pngButton.disabled = true;
    svgButton.disabled = true;
    cardButton.disabled = true;
    return;
  }

  const ratio = settings.transparent
    ? Infinity
    : contrastRatio(settings.foreground, settings.background);
  contrastNotice.textContent =
    ratio < 4.5
      ? `Contraste bajo (${ratio.toFixed(
          1
        )}:1). El QR puede fallar al escanearse. Usa negro sobre blanco.`
      : `Contraste ${Number.isFinite(ratio) ? `${ratio.toFixed(1)}:1` : "dependiente del fondo"}.`;
  contrastNotice.dataset.kind = ratio < 4.5 ? "warning" : "ok";

  showStatus("Generando vista previa…");
  try {
    await renderQrCanvas(canvas, validation.url, settings);
    lastSettings = { ...settings, url: validation.url };
    showStatus(
      settings.logoDataUrl && settings.errorCorrection !== "H"
        ? "Vista previa lista. Para usar logotipo se recomienda corrección H."
        : "Vista previa lista.",
      "success"
    );
    pngButton.disabled = false;
    svgButton.disabled = false;
    cardButton.disabled = false;
    track("qr_generate", settings.errorCorrection);
  } catch {
    showStatus("No se ha podido generar el QR con esos ajustes.", "error");
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(render, 120);
}

logoInput?.addEventListener("change", () => {
  const file = logoInput.files?.[0];
  if (!file) {
    logoDataUrl = "";
    scheduleRender();
    return;
  }
  if (!file.type.startsWith("image/") || file.size > 2_000_000) {
    logoInput.value = "";
    showStatus("El logotipo debe ser una imagen de menos de 2 MB.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    logoDataUrl = String(reader.result || "");
    scheduleRender();
  };
  reader.readAsDataURL(file);
});

form?.addEventListener("input", scheduleRender);
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});

pngButton?.addEventListener("click", async () => {
  if (!lastSettings) return;
  await renderQrCanvas(canvas, lastSettings.url, lastSettings);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, safeFileName(lastSettings.url, "png"));
  track("qr_download", "png");
});

svgButton?.addEventListener("click", async () => {
  if (!lastSettings) return;
  const svg = await makeQrSvg(lastSettings.url, lastSettings);
  downloadBlob(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    safeFileName(lastSettings.url, "svg")
  );
  track("qr_download", "svg");
});

cardButton?.addEventListener("click", () => {
  if (!lastSettings) return;
  sessionStorage.setItem(
    "afropx-card-qr",
    JSON.stringify({
      url: lastSettings.url,
      errorCorrection: lastSettings.errorCorrection,
      margin: lastSettings.margin,
      foreground: lastSettings.foreground,
      background: lastSettings.background
    })
  );
  window.location.href = "/herramientas/tarjetas/?source=qr";
});

const featured = getFeaturedRelease();
const defaultUrl =
  new URLSearchParams(window.location.search).get("url") ||
  featured?.links?.presave ||
  SITE_CONFIG.site.origin;
const urlInput = form?.elements.namedItem("url");
if (urlInput && !urlInput.value) urlInput.value = defaultUrl;
render();
