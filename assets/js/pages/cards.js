import SITE_CONFIG, { getFeaturedRelease } from "../../../config/site.js";
import { track } from "../core/analytics.js";
import {
  canvasToBlob,
  downloadBlob,
  makeQrDataUrl,
  safeFileName,
  validateHttpUrl
} from "../core/qr-engine.js";

const FORMATS = {
  story: { width: 1080, height: 1920, label: "Historia 1080 × 1920" },
  portrait: { width: 1080, height: 1350, label: "Vertical 1080 × 1350" },
  square: { width: 1080, height: 1080, label: "Cuadrado 1080 × 1080" },
  horizontal: { width: 1280, height: 720, label: "Horizontal 1280 × 720" }
};

const release = getFeaturedRelease();
const form = document.querySelector("[data-card-form]");
const canvas = document.querySelector("[data-card-canvas]");
const preview = document.querySelector("[data-card-preview]");
const status = document.querySelector("[data-card-status]");
const downloadButton = document.querySelector("[data-card-download]");
const coverInput = document.querySelector("[data-card-cover]");
const songSelect = form?.elements.namedItem("song");
const customSong = form?.elements.namedItem("customSong");

let uploadedCover = "";
let renderSequence = 0;
let timer = 0;
let lastState = null;

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    if (!source.startsWith("data:") && !source.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCover(context, image, x, y, width, height, filter = true) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / boxRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.save();
  if (filter) context.filter = "grayscale(1) contrast(1.12)";
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
  context.restore();
}

function wrapLines(context, text, maxWidth, maxLines) {
  const words = String(text).trim().split(/\s+/u);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  const consumed = lines.join(" ").split(/\s+/u).length;
  if (consumed < words.length) {
    let last = lines.at(-1) || "";
    while (
      last &&
      context.measureText(`${last}…`).width > maxWidth
    ) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trim()}…`;
  }
  return lines;
}

function fitTitle(context, text, maxWidth, maxHeight, maxFontSize) {
  for (let fontSize = maxFontSize; fontSize >= 44; fontSize -= 4) {
    context.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`;
    const lineHeight = fontSize * 0.88;
    const maxLines = Math.max(2, Math.floor(maxHeight / lineHeight));
    const lines = wrapLines(context, text.toUpperCase(), maxWidth, maxLines);
    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize, lineHeight, lines };
    }
  }
  return {
    fontSize: 44,
    lineHeight: 40,
    lines: wrapLines(context, text.toUpperCase(), maxWidth, 5)
  };
}

function currentValues() {
  const data = new FormData(form);
  const format = FORMATS[String(data.get("format"))] || FORMATS.story;
  const selectedSong = String(data.get("song") || "");
  const title =
    selectedSong === "__custom__"
      ? String(data.get("customSong") || "").trim()
      : selectedSong;
  return {
    ...format,
    formatId: String(data.get("format") || "story"),
    template: String(data.get("template") || "cut"),
    title: title || release?.title || "Nueva canción",
    artist: String(data.get("artist") || SITE_CONFIG.artist.name).trim(),
    promo: String(data.get("promo") || "").trim(),
    link: String(data.get("link") || "").trim(),
    cta: String(data.get("cta") || "ESCUCHAR AHORA").trim(),
    includeQr: data.get("includeQr") === "on",
    includeCta: data.get("includeCta") === "on",
    cover: uploadedCover || release?.cover || SITE_CONFIG.artist.image
  };
}

function drawBrand(context, state, x, y, color) {
  context.fillStyle = color;
  context.font = `900 ${Math.round(state.width * 0.028)}px Arial, sans-serif`;
  context.letterSpacing = "2px";
  context.fillText("AFRO", x, y);
  const offset = context.measureText("AFRO").width;
  context.fillStyle = "#23c4cc";
  context.fillText("PX", x + offset, y);
  context.letterSpacing = "0px";
}

function drawTemplate(context, image, state) {
  const { width, height } = state;
  const margin = Math.round(Math.min(width, height) * 0.06);
  const landscape = width > height;
  const coverSize = landscape
    ? Math.round(height - margin * 2)
    : Math.round(width - margin * 2);

  if (state.template === "negative") {
    context.fillStyle = "#f5f4ef";
    context.fillRect(0, 0, width, height);
    drawCover(context, image, 0, 0, width, height, true);
    context.fillStyle = "rgba(245,244,239,.88)";
    context.fillRect(
      landscape ? width * 0.48 : margin * 0.7,
      landscape ? margin : height * 0.49,
      landscape ? width * 0.48 : width - margin * 1.4,
      landscape ? height - margin * 2 : height * 0.45
    );
  } else if (state.template === "brutal") {
    context.fillStyle = "#ff2d23";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#050505";
    context.fillRect(0, 0, landscape ? width * 0.56 : width, landscape ? height : height * 0.58);
    drawCover(
      context,
      image,
      landscape ? margin : margin,
      landscape ? margin : margin,
      landscape ? coverSize : width - margin * 2,
      landscape ? coverSize : Math.round(height * 0.5),
      true
    );
  } else {
    context.fillStyle = "#050505";
    context.fillRect(0, 0, width, height);
    if (landscape) {
      drawCover(context, image, 0, 0, width * 0.52, height, true);
      context.fillStyle = "#ff2d23";
      context.fillRect(width * 0.5, margin, Math.round(width * 0.018), height - margin * 2);
    } else {
      drawCover(context, image, margin, margin, coverSize, coverSize, true);
      context.fillStyle = "#ff2d23";
      context.fillRect(margin * 1.45, margin + coverSize, width - margin * 2.9, Math.max(18, height * 0.012));
    }
  }

  return { margin, coverSize, landscape };
}

async function drawContent(context, state, layout) {
  const { width, height } = state;
  const { margin, coverSize, landscape } = layout;
  let panelX;
  let panelY;
  let panelWidth;
  let panelHeight;
  let textColor;

  if (state.template === "negative") {
    panelX = landscape ? width * 0.52 : margin;
    panelY = landscape ? margin * 1.6 : height * 0.53;
    panelWidth = landscape ? width * 0.42 : width - margin * 2;
    panelHeight = landscape ? height - margin * 3.2 : height * 0.39;
    textColor = "#050505";
  } else if (state.template === "brutal") {
    panelX = landscape ? width * 0.61 : margin;
    panelY = landscape ? margin : height * 0.62;
    panelWidth = landscape ? width * 0.33 : width - margin * 2;
    panelHeight = landscape ? height - margin * 2 : height * 0.32;
    textColor = landscape ? "#050505" : "#050505";
  } else {
    panelX = landscape ? width * 0.58 : margin;
    panelY = landscape ? margin * 1.3 : margin + coverSize + margin * 0.75;
    panelWidth = landscape ? width * 0.36 : width - margin * 2;
    panelHeight = landscape ? height - margin * 2.6 : height - panelY - margin;
    textColor = "#f5f4ef";
  }

  drawBrand(context, state, panelX, panelY, textColor);
  const titleTop = panelY + Math.round(height * 0.07);
  const titleSpace = panelHeight * 0.47;
  context.fillStyle = textColor;
  context.textBaseline = "top";
  const fitted = fitTitle(
    context,
    state.title,
    panelWidth,
    titleSpace,
    Math.round(Math.min(width, height) * (landscape ? 0.105 : 0.095))
  );
  context.font = `900 ${fitted.fontSize}px Arial Black, Arial, sans-serif`;
  fitted.lines.forEach((line, index) => {
    context.fillText(line, panelX, titleTop + index * fitted.lineHeight);
  });

  const titleBottom = titleTop + fitted.lines.length * fitted.lineHeight;
  context.fillStyle = state.template === "cut" ? "#ff2d23" : "#050505";
  context.font = `800 ${Math.round(Math.min(width, height) * 0.025)}px Arial, sans-serif`;
  context.fillText(
    state.artist.toUpperCase(),
    panelX,
    titleBottom + Math.round(height * 0.02)
  );

  if (state.promo) {
    context.fillStyle =
      state.template === "cut" ? "#aaa9a3" : "rgba(5,5,5,.72)";
    context.font = `500 ${Math.round(Math.min(width, height) * 0.021)}px Arial, sans-serif`;
    const promoLines = wrapLines(context, state.promo, panelWidth, 3);
    promoLines.forEach((line, index) => {
      context.fillText(
        line,
        panelX,
        titleBottom +
          Math.round(height * 0.065) +
          index * Math.round(Math.min(width, height) * 0.03)
      );
    });
  }

  const bottomY = panelY + panelHeight;
  if (state.includeCta && state.cta) {
    const ctaHeight = Math.round(Math.min(width, height) * 0.065);
    const ctaWidth = Math.min(
      panelWidth,
      Math.round(Math.min(width, height) * 0.42)
    );
    context.fillStyle = "#ff2d23";
    context.fillRect(panelX, bottomY - ctaHeight, ctaWidth, ctaHeight);
    context.fillStyle = "#050505";
    context.font = `900 ${Math.round(Math.min(width, height) * 0.018)}px Arial, sans-serif`;
    context.textBaseline = "middle";
    context.fillText(
      state.cta.toUpperCase().slice(0, 32),
      panelX + ctaHeight * 0.32,
      bottomY - ctaHeight / 2
    );
  }

  if (state.includeQr && validateHttpUrl(state.link).valid) {
    const qrSize = Math.round(Math.min(width, height) * 0.18);
    const dataUrl = await makeQrDataUrl(state.link, {
      size: qrSize * 2,
      margin: 2,
      errorCorrection: "H",
      foreground: "#050505",
      background: "#ffffff"
    });
    const qr = await loadImage(dataUrl);
    context.drawImage(
      qr,
      width - margin - qrSize,
      height - margin - qrSize,
      qrSize,
      qrSize
    );
  }

  context.save();
  context.strokeStyle =
    state.template === "cut" ? "rgba(255,255,255,.2)" : "rgba(5,5,5,.18)";
  context.lineWidth = Math.max(2, width * 0.002);
  context.beginPath();
  context.moveTo(margin, height - margin * 0.52);
  context.lineTo(width - margin, height - margin * 0.52);
  context.stroke();
  context.restore();
}

async function renderCard() {
  const sequence = ++renderSequence;
  const state = currentValues();
  status.textContent = "Actualizando vista previa…";
  downloadButton.disabled = true;

  try {
    const image = await loadImage(state.cover);
    if (sequence !== renderSequence) return;

    canvas.width = state.width;
    canvas.height = state.height;
    preview.style.setProperty("--card-ratio", `${state.width} / ${state.height}`);
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const layout = drawTemplate(context, image, state);
    await drawContent(context, state, layout);

    if (sequence !== renderSequence) return;
    lastState = state;
    status.textContent = `${FORMATS[state.formatId].label} · procesado localmente`;
    downloadButton.disabled = false;
    track("card_generate", state.formatId);
  } catch {
    status.textContent =
      "No se ha podido cargar la portada. Prueba con otra imagen.";
  }
}

function scheduleRender() {
  window.clearTimeout(timer);
  timer = window.setTimeout(renderCard, 100);
}

release?.tracks?.forEach((trackName) => {
  const option = document.createElement("option");
  option.value = trackName.replace(/\s+—\s+feat\..*$/u, "");
  option.textContent = trackName;
  songSelect?.insertBefore(option, songSelect.lastElementChild);
});

if (songSelect && release?.tracks?.[0]) {
  songSelect.value = release.tracks[0].replace(/\s+—\s+feat\..*$/u, "");
}

songSelect?.addEventListener("change", () => {
  const custom = songSelect.value === "__custom__";
  customSong.closest(".field")?.toggleAttribute("hidden", !custom);
  if (custom) customSong.focus();
  scheduleRender();
});

coverInput?.addEventListener("change", () => {
  const file = coverInput.files?.[0];
  if (!file) {
    uploadedCover = "";
    scheduleRender();
    return;
  }
  if (!file.type.startsWith("image/") || file.size > 12_000_000) {
    coverInput.value = "";
    status.textContent = "Usa una imagen JPG, PNG o WebP de menos de 12 MB.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedCover = String(reader.result || "");
    scheduleRender();
  };
  reader.readAsDataURL(file);
});

form?.addEventListener("input", scheduleRender);
form?.addEventListener("change", scheduleRender);
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderCard();
});

downloadButton?.addEventListener("click", async () => {
  if (!lastState) return;
  const blob = await canvasToBlob(canvas);
  downloadBlob(
    blob,
    safeFileName(`${lastState.artist}-${lastState.title}`, "png")
  );
  track("card_download", lastState.formatId);
});

const transferredQr = sessionStorage.getItem("afropx-card-qr");
if (transferredQr) {
  try {
    const payload = JSON.parse(transferredQr);
    const linkInput = form.elements.namedItem("link");
    const qrToggle = form.elements.namedItem("includeQr");
    if (validateHttpUrl(payload.url).valid) {
      linkInput.value = payload.url;
      qrToggle.checked = true;
    }
  } catch {
    // Ignora datos locales inválidos.
  }
  sessionStorage.removeItem("afropx-card-qr");
}

if (release) {
  const linkInput = form?.elements.namedItem("link");
  if (linkInput && !linkInput.value) {
    linkInput.value = release.links.presave || `${SITE_CONFIG.site.origin}${release.path}`;
  }
}

renderCard();
