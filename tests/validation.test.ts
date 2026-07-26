import { describe, expect, it } from "vitest";
import { HttpError } from "../functions/lib/http";
import {
  serviceSnapshot,
  validateBookingInput
} from "../functions/lib/validation";

const validInput = {
  clientRequestId: "12345678-1234-1234-1234-123456789abc",
  serviceId: "remote-mix-master",
  localDate: "2026-08-03",
  localTime: "17:00",
  customerName: "Pedro Ejemplo",
  customerEmail: "artista@example.com",
  customerPhone: "+34 600 000 000",
  artistName: "Demo",
  songCount: 2,
  filesUrl: "https://drive.google.com/example",
  projectNotes: "Quiero terminar dos temas de un proyecto urbano.",
  privacyAccepted: true,
  marketingConsent: false,
  turnstileToken: "development-bypass"
};

describe("booking validation and prices", () => {
  it("normalizes valid booking input", () => {
    expect(validateBookingInput(validInput)).toMatchObject({
      customerEmail: "artista@example.com",
      songCount: 2,
      marketingConsent: false
    });
  });

  it("rejects invalid contact, URL and missing privacy acceptance", () => {
    try {
      validateBookingInput({
        ...validInput,
        customerEmail: "not-an-email",
        customerPhone: "12",
        filesUrl: "javascript:alert(1)",
        privacyAccepted: false
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).details).toMatchObject({
        customerEmail: expect.any(String),
        customerPhone: expect.any(String),
        filesUrl: expect.any(String),
        privacyAccepted: expect.any(String)
      });
    }
  });

  it("uses the real configured prices and leaves unknown prices unset", () => {
    expect(serviceSnapshot("recording-mix-master")).toMatchObject({
      priceCents: 8000,
      priceLabel: "80 € / canción"
    });
    expect(serviceSnapshot("remote-mix-master")).toMatchObject({
      priceCents: 6000,
      priceLabel: "60 € / canción"
    });
    expect(serviceSnapshot("project-pack")).toMatchObject({
      priceCents: null,
      priceLabel: "Presupuesto personalizado"
    });
  });
});
