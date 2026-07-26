import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const SOURCES = [
  ["afropx-front.webp", [640, 960, 1400]],
  ["afropx-side.webp", [640, 960, 1400]],
  ["afropx-back.webp", [640, 960, 1400]],
  ["drive-double.webp", [640, 960, 1400]],
  ["drive-fin.webp", [640, 960, 1400]],
  ["drive-point.webp", [640, 960, 1400]],
  ["algblpcm-cover-final.webp", [480, 800, 1200]],
  ["sad-face.webp", [480, 800]]
];

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function optimizeImages() {
  const imageDirectory = path.join(ROOT, "assets", "images");
  let created = 0;

  for (const [fileName, widths] of SOURCES) {
    const source = path.join(imageDirectory, fileName);
    const metadata = await sharp(source).metadata();
    const base = path.basename(fileName, path.extname(fileName));

    for (const width of widths) {
      if (!metadata.width || width >= metadata.width) continue;
      const output = path.join(imageDirectory, `${base}-${width}.webp`);
      if (await exists(output)) continue;
      await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5, smartSubsample: true })
        .toFile(output);
      created += 1;
    }
  }

  console.log(
    created
      ? `Imágenes responsive generadas: ${created}.`
      : "Imágenes responsive: sin cambios."
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await optimizeImages();
}
