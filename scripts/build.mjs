import { build } from "esbuild";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { runSiteChecks } from "./check-site.mjs";
import { optimizeImages } from "./images.mjs";

const entryPoints = {
  site: "assets/js/core/site.js",
  booking: "assets/js/pages/booking.js",
  "smart-links": "assets/js/pages/smart-links.js",
  qr: "assets/js/pages/qr.js",
  cards: "assets/js/pages/cards.js",
  admin: "assets/js/pages/admin.js"
};

const versionedAssets = [
  "styles.css",
  "assets/css/advanced.css",
  "script.js",
  ...Object.keys(entryPoints).map((name) => `assets/dist/${name}.js`)
];

async function htmlFiles(directory = ".") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === ".wrangler" ||
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "coverage"
    ) {
      continue;
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(file)));
    else if (entry.name.endsWith(".html")) files.push(file);
  }
  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function versionAssets() {
  const versions = new Map();
  for (const asset of versionedAssets) {
    const contents = await readFile(asset);
    const version = createHash("sha256")
      .update(contents)
      .digest("hex")
      .slice(0, 10);
    versions.set(asset, version);
  }

  for (const htmlFile of await htmlFiles()) {
    let source = await readFile(htmlFile, "utf8");
    for (const [asset, version] of versions) {
      const pattern = new RegExp(
        `(["'])/${escapeRegExp(asset)}(?:\\?v=[^"']*)?\\1`,
        "gu"
      );
      source = source.replace(
        pattern,
        (_match, quote) => `${quote}/${asset}?v=${version}${quote}`
      );
    }
    await writeFile(htmlFile, source, "utf8");
  }
}

const publishEntries = [
  "index.html",
  "404.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "_routes.json",
  "mixing",
  "lanzamientos",
  "escuchar",
  "herramientas",
  "legal",
  "admin",
  "assets/css",
  "assets/dist",
  "assets/icons",
  "assets/images"
];

async function preparePublishDirectory() {
  await rm("dist", {
    recursive: true,
    force: true,
    maxRetries: 6,
    retryDelay: 120
  });
  await mkdir("dist", { recursive: true });

  for (const entry of publishEntries) {
    const destination = path.join("dist", entry);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(entry, destination, { recursive: true });
  }

  const required = [
    "dist/index.html",
    "dist/404.html",
    "dist/assets/dist/site.js",
    "dist/assets/dist/booking.js",
    "dist/_headers",
    "dist/_routes.json"
  ];
  await Promise.all(required.map((file) => access(file)));

  const forbidden = [
    "dist/node_modules",
    "dist/functions",
    "dist/migrations",
    "dist/tests",
    "dist/config",
    "dist/.dev.vars",
    "dist/package.json"
  ];
  for (const file of forbidden) {
    try {
      await access(file);
      throw new Error(`El build público contiene un archivo privado: ${file}`);
    } catch (error) {
      if (
        error instanceof Error &&
        !("code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }
    }
  }
}

await optimizeImages();

await build({
  entryPoints,
  bundle: true,
  outdir: "assets/dist",
  format: "esm",
  platform: "browser",
  target: ["es2020", "safari15"],
  minify: true,
  legalComments: "none",
  charset: "utf8",
  entryNames: "[name]",
  logLevel: "info"
});

await versionAssets();
await runSiteChecks();
await preparePublishDirectory();
