import SITE_CONFIG, { getFeaturedRelease } from "../../../config/site.js";
import { track } from "../core/analytics.js";
import { renderQrCanvas } from "../core/qr-engine.js";

const release = getFeaturedRelease();
const list = document.querySelector("[data-smart-platforms]");
const qrCanvas = document.querySelector("[data-smart-qr]");
const title = document.querySelector("[data-smart-title]");
const cover = document.querySelector("[data-smart-cover]");
const status = document.querySelector("[data-smart-status]");

function withUtm(rawUrl, platformId) {
  const url = new URL(rawUrl);
  const { source, medium, campaign } = SITE_CONFIG.smartLinks.utm;
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", platformId);
  return url.toString();
}

function renderPlatforms() {
  const isAppleDevice = /iPhone|iPad|Macintosh/u.test(navigator.userAgent);
  const platforms = SITE_CONFIG.smartLinks.platforms
    .filter((platform) => platform.enabled && platform.url)
    .sort((first, second) => {
      if (isAppleDevice && first.id === "apple-music") return -1;
      if (isAppleDevice && second.id === "apple-music") return 1;
      return Number(Boolean(second.featured)) - Number(Boolean(first.featured));
    });

  list.replaceChildren(
    ...platforms.map((platform, index) => {
      const anchor = document.createElement("a");
      anchor.className = `smart-platform${
        platform.featured ? " smart-platform-featured" : ""
      }`;
      anchor.href = withUtm(platform.url, platform.id);
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.dataset.track = "platform_click";
      anchor.dataset.trackDetail = platform.id;
      anchor.innerHTML = `<span>${String(index + 1).padStart(
        2,
        "0"
      )}</span><strong></strong><em></em>`;
      anchor.querySelector("strong").textContent = platform.label;
      anchor.querySelector("em").textContent = platform.note;
      return anchor;
    })
  );
}

if (release) {
  title.textContent = release.title;
  cover.src = release.cover;
  cover.alt = `Portada de ${release.title} de ${release.artist}`;
}

renderPlatforms();
renderQrCanvas(qrCanvas, window.location.href, {
  size: 520,
  margin: 3,
  errorCorrection: "H",
  foreground: "#050505",
  background: "#ffffff"
})
  .then(() => {
    status.textContent = "Escanea para abrir esta página.";
  })
  .catch(() => {
    status.textContent = "El QR no está disponible en este navegador.";
  });

document
  .querySelector("[data-smart-share]")
  ?.addEventListener("click", () => track("share_open", "smart-links"));
