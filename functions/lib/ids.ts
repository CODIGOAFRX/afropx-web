const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomToken(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(
    bytes,
    (byte) => ALPHABET[byte % ALPHABET.length]
  ).join("");
}

export function createBookingId(localDate: string): string {
  return `AFR-${localDate.replaceAll("-", "")}-${randomToken(6)}`;
}

export function createOpaqueId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
