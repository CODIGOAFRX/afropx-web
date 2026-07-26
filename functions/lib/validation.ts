import { getServiceById, formatPrice } from "../../config/site.js";
import { HttpError } from "./http";
import { isIsoDate, isTime } from "./time";
import type { BookingInput, ServiceSnapshot } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const PHONE_RE = /^[+()\d\s.-]{7,30}$/u;
const CLIENT_ID_RE = /^[a-zA-Z0-9_-]{16,80}$/u;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
    .trim()
    .slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number): string | null {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function optionalUrl(value: unknown): string | null {
  const cleaned = optionalText(value, 1_000);
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function serviceSnapshot(serviceId: string): ServiceSnapshot {
  const service = getServiceById(serviceId);
  if (!service || !service.bookable) {
    throw new HttpError(
      422,
      "INVALID_SERVICE",
      "El servicio seleccionado no está disponible."
    );
  }

  return {
    id: service.id,
    name: service.name,
    priceCents: service.priceCents,
    priceLabel: formatPrice(service),
    currency: service.currency || "EUR",
    durationMinutes: service.durationMinutes,
    durationLabel: service.durationLabel,
    includes: [...service.includes]
  };
}

export function validateBookingInput(value: unknown): BookingInput {
  if (!value || typeof value !== "object") {
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      "Revisa los datos de la solicitud."
    );
  }

  const body = value as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const clientRequestId = cleanText(body.clientRequestId, 80);
  if (!CLIENT_ID_RE.test(clientRequestId)) {
    fields.clientRequestId = "Identificador de solicitud no válido.";
  }

  const serviceId = cleanText(body.serviceId, 80);
  try {
    serviceSnapshot(serviceId);
  } catch {
    fields.serviceId = "Selecciona un servicio disponible.";
  }

  const localDate = cleanText(body.localDate, 10);
  if (!isIsoDate(localDate)) {
    fields.localDate = "Selecciona una fecha válida.";
  }

  const localTime = cleanText(body.localTime, 5);
  if (!isTime(localTime)) {
    fields.localTime = "Selecciona una hora válida.";
  }

  const customerName = cleanText(body.customerName, 100);
  if (customerName.length < 2) {
    fields.customerName = "Escribe tu nombre.";
  }

  const customerEmail = cleanText(body.customerEmail, 254).toLowerCase();
  if (!EMAIL_RE.test(customerEmail)) {
    fields.customerEmail = "Escribe un correo válido.";
  }

  const customerPhone = cleanText(body.customerPhone, 30);
  if (!PHONE_RE.test(customerPhone)) {
    fields.customerPhone = "Escribe un teléfono o WhatsApp válido.";
  }

  const artistName = optionalText(body.artistName, 100);
  const rawSongCount =
    body.songCount === "" || body.songCount == null
      ? null
      : Number(body.songCount);
  const songCount =
    rawSongCount != null && Number.isInteger(rawSongCount)
      ? rawSongCount
      : null;
  if (
    rawSongCount != null &&
    (!Number.isInteger(rawSongCount) || rawSongCount < 1 || rawSongCount > 999)
  ) {
    fields.songCount = "Indica un número de canciones entre 1 y 999.";
  }

  const rawFilesUrl = optionalText(body.filesUrl, 1_000);
  const filesUrl = optionalUrl(body.filesUrl);
  if (rawFilesUrl && !filesUrl) {
    fields.filesUrl = "El enlace de archivos no es válido.";
  }

  const projectNotes = cleanText(body.projectNotes, 3_000);
  if (projectNotes.length < 10) {
    fields.projectNotes =
      "Cuéntame brevemente en qué punto está el proyecto.";
  }

  const privacyAccepted = body.privacyAccepted === true;
  if (!privacyAccepted) {
    fields.privacyAccepted =
      "Debes aceptar la política de privacidad para continuar.";
  }

  const marketingConsent = body.marketingConsent === true;
  const turnstileToken = cleanText(body.turnstileToken, 2_048);

  if (Object.keys(fields).length > 0) {
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      fields
    );
  }

  return {
    clientRequestId,
    serviceId,
    localDate,
    localTime,
    customerName,
    customerEmail,
    customerPhone,
    artistName,
    songCount,
    filesUrl,
    projectNotes,
    privacyAccepted,
    marketingConsent,
    turnstileToken
  };
}

export function validateMonth(value: string | null): string {
  if (!value || !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(value)) {
    throw new HttpError(
      422,
      "INVALID_MONTH",
      "El mes solicitado no es válido."
    );
  }
  return value;
}

export function validateStatus(value: unknown): string {
  const status = cleanText(value, 20);
  if (
    !["pending", "confirmed", "rejected", "cancelled", "completed"].includes(
      status
    )
  ) {
    throw new HttpError(
      422,
      "INVALID_STATUS",
      "El estado indicado no es válido."
    );
  }
  return status;
}

export function sanitizeAdminNote(value: unknown): string {
  return cleanText(value, 4_000);
}
