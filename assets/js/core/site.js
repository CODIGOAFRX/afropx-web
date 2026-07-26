import SITE_CONFIG, { getFeaturedRelease } from "../../../config/site.js";
import { initAnalytics, track } from "./analytics.js";

function hydrateContacts() {
  document.querySelectorAll("[data-artist-email]").forEach((element) => {
    const display =
      element.dataset.artistEmailCase === "upper"
        ? SITE_CONFIG.site.contactEmail.toUpperCase()
        : SITE_CONFIG.site.contactEmail;
    if (element instanceof HTMLAnchorElement) {
      element.href = `mailto:${SITE_CONFIG.site.contactEmail}`;
    }
    if (element.dataset.artistEmailText !== "false") {
      element.textContent = display;
    }
  });

  document.querySelectorAll("[data-mixing-email]").forEach((element) => {
    if (element instanceof HTMLAnchorElement) {
      element.href = `mailto:${SITE_CONFIG.site.mixingEmail}`;
    }
  });

  document.querySelectorAll("[data-booking-link]").forEach((element) => {
    if (element instanceof HTMLAnchorElement) {
      element.href = "/mixing/reservar/";
    }
  });
}

function hydrateReleaseLinks() {
  const release = getFeaturedRelease();
  if (!release?.links) return;

  document.querySelectorAll("[data-release-link]").forEach((link) => {
    const key = link.dataset.releaseLink;
    const url = String(release.links[key] || link.getAttribute("href") || "").trim();
    const note = link.querySelector("[data-release-note]");
    if (url) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.classList.remove("is-unavailable");
      link.removeAttribute("aria-disabled");
      if (note) note.textContent = link.dataset.readyLabel || "Abrir enlace";
    } else {
      link.removeAttribute("href");
      link.classList.add("is-unavailable");
      link.setAttribute("aria-disabled", "true");
      if (note) note.textContent = "Disponible pronto";
    }
  });
}

async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  const original = button.textContent;
  button.textContent = button.dataset.copySuccess || "Copiado";
  button.setAttribute("data-copied", "true");
  window.setTimeout(() => {
    button.textContent = original;
    button.removeAttribute("data-copied");
  }, 1_800);
}

function initCopyAndShare() {
  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      const value =
        copyButton.dataset.copy === "current-url"
          ? window.location.href
          : copyButton.dataset.copy;
      await copyText(value, copyButton);
      track("link_copy", copyButton.dataset.trackDetail || "page");
      return;
    }

    const shareButton = event.target.closest("[data-share]");
    if (!shareButton) return;
    const data = {
      title: shareButton.dataset.shareTitle || document.title,
      text: shareButton.dataset.shareText || "",
      url:
        shareButton.dataset.share === "current-url"
          ? window.location.href
          : shareButton.dataset.share
    };
    track("share_open", shareButton.dataset.trackDetail || "page");

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyText(data.url, shareButton);
  });
}

function initEnhancedReveals() {
  if (!("IntersectionObserver" in window)) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const candidates = document.querySelectorAll(
    "[data-scroll-reveal]:not(.is-visible)"
  );
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  candidates.forEach((candidate) => observer.observe(candidate));
}

hydrateContacts();
hydrateReleaseLinks();
initCopyAndShare();
initEnhancedReveals();
initAnalytics();

window.AfroPX = Object.freeze({
  config: SITE_CONFIG,
  track
});
