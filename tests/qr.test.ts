import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  contrastRatio,
  validateHttpUrl
} from "../assets/js/core/qr-engine.js";

function rasterizeQr(value: string, scale = 8, margin = 4) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const modules = qr.modules;
  const moduleCount = modules.size;
  const width = (moduleCount + margin * 2) * scale;
  const data = new Uint8ClampedArray(width * width * 4);

  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const moduleX = Math.floor(x / scale) - margin;
      const moduleY = Math.floor(y / scale) - margin;
      const dark =
        moduleX >= 0 &&
        moduleY >= 0 &&
        moduleX < moduleCount &&
        moduleY < moduleCount &&
        modules.get(moduleX, moduleY);
      const color = dark ? 5 : 255;
      const offset = (y * width + x) * 4;
      data[offset] = color;
      data[offset + 1] = color;
      data[offset + 2] = color;
      data[offset + 3] = 255;
    }
  }
  return { data, width };
}

describe("QR generator", () => {
  it("accepts only complete HTTP(S) links", () => {
    expect(validateHttpUrl("https://afropxmusic.com/escuchar/").valid).toBe(
      true
    );
    expect(validateHttpUrl("javascript:alert(1)").valid).toBe(false);
    expect(validateHttpUrl("afropxmusic.com").valid).toBe(false);
  });

  it("warns through contrast calculations", () => {
    expect(contrastRatio("#050505", "#ffffff")).toBeGreaterThan(19);
    expect(contrastRatio("#777777", "#888888")).toBeLessThan(2);
  });

  it("produces a matrix that remains machine-readable", () => {
    const value = "https://afropxmusic.com/escuchar/?utm_source=test";
    const image = rasterizeQr(value);
    const decoded = jsQR(image.data, image.width, image.width);
    expect(decoded?.data).toBe(value);
  });
});
