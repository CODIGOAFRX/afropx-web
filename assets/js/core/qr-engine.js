import QRCode from "qrcode";

export function validateHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (!["https:", "http:"].includes(url.protocol)) {
      return { valid: false, message: "Usa una URL que empiece por https://." };
    }
    return { valid: true, url: url.toString(), message: "" };
  } catch {
    return { valid: false, message: "Escribe una URL completa y válida." };
  }
}

function normalizeHex(hex) {
  const value = String(hex).trim().replace("#", "");
  if (/^[0-9a-f]{3}$/iu.test(value)) {
    return value
      .split("")
      .map((character) => `${character}${character}`)
      .join("");
  }
  if (/^[0-9a-f]{6}$/iu.test(value)) return value;
  return null;
}

function luminance(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const channels = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(normalized.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  if (first == null || second == null) return 0;
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function safeFileName(value, extension) {
  const base = String(value || "afropx-qr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/https?:\/\//gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 70);
  return `${base || "afropx-qr"}.${extension}`;
}

function options(settings) {
  return {
    errorCorrectionLevel: settings.errorCorrection || "H",
    margin: Number(settings.margin ?? 4),
    width: Number(settings.size || 800),
    color: {
      dark: settings.foreground || "#050505",
      light: settings.transparent
        ? "#00000000"
        : settings.background || "#ffffff"
    }
  };
}

async function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function drawLogo(canvas, logoDataUrl) {
  if (!logoDataUrl) return;
  const image = await loadImage(logoDataUrl);
  const context = canvas.getContext("2d");
  const size = Math.round(canvas.width * 0.19);
  const padding = Math.round(canvas.width * 0.018);
  const x = Math.round((canvas.width - size) / 2);
  const y = Math.round((canvas.height - size) / 2);

  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(x - padding, y - padding, size + padding * 2, size + padding * 2);
  context.drawImage(image, x, y, size, size);
  context.restore();
}

export async function renderQrCanvas(canvas, value, settings = {}) {
  const validation = validateHttpUrl(value);
  if (!validation.valid) throw new Error(validation.message);

  await QRCode.toCanvas(canvas, validation.url, options(settings));
  if (settings.logoDataUrl) {
    await drawLogo(canvas, settings.logoDataUrl);
  }
  return canvas;
}

export async function makeQrDataUrl(value, settings = {}) {
  const validation = validateHttpUrl(value);
  if (!validation.valid) throw new Error(validation.message);
  return QRCode.toDataURL(validation.url, options(settings));
}

export async function makeQrSvg(value, settings = {}) {
  const validation = validateHttpUrl(value);
  if (!validation.valid) throw new Error(validation.message);
  let svg = await QRCode.toString(validation.url, {
    ...options(settings),
    type: "svg"
  });

  if (settings.logoDataUrl) {
    const logo = String(settings.logoDataUrl)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;");
    const overlay = `<rect x="39%" y="39%" width="22%" height="22%" fill="#fff"/><image href="${logo}" x="41%" y="41%" width="18%" height="18%" preserveAspectRatio="xMidYMid meet"/>`;
    svg = svg.replace("</svg>", `${overlay}</svg>`);
  }
  return svg;
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      fetch(canvas.toDataURL("image/png"))
        .then((response) => response.blob())
        .then(resolve, reject);
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se ha podido generar el PNG."));
    }, "image/png");
  });
}
