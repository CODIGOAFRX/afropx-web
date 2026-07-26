import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === ".wrangler" ||
      entry.name === "dist" ||
      entry.name === "coverage"
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function internalTarget(pageFile, rawValue) {
  const value = rawValue.split("#")[0].split("?")[0];
  if (
    !value ||
    /^(?:https?:|mailto:|tel:|data:|javascript:)/iu.test(value)
  ) {
    return null;
  }

  let target = value.startsWith("/")
    ? path.join(ROOT, value)
    : path.resolve(path.dirname(pageFile), value);
  if (value.endsWith("/")) target = path.join(target, "index.html");
  if (!path.extname(target)) {
    target = path.join(target, "index.html");
  }
  return target;
}

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runSiteChecks() {
  const files = await walk(ROOT);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const errors = [];
  const canonicals = new Map();

  for (const htmlFile of htmlFiles) {
    const source = await readFile(htmlFile, "utf8");
    const relative = path.relative(ROOT, htmlFile);

    if (source.includes("afropxoficial@gmail.com")) {
      errors.push(`${relative}: contiene el correo artístico antiguo.`);
    }
    if (/localhost:\d+/u.test(source)) {
      errors.push(`${relative}: contiene una URL local.`);
    }

    const title = source.match(/<title>([^<]+)<\/title>/iu)?.[1];
    const description = source.match(
      /<meta\s+name="description"\s+content="([^"]+)"/iu
    )?.[1];
    const canonical = source.match(
      /<link\s+rel="canonical"\s+href="([^"]+)"/iu
    )?.[1];
    if (!title) errors.push(`${relative}: falta <title>.`);
    if (!description) errors.push(`${relative}: falta meta description.`);
    if (!canonical && path.basename(htmlFile) !== "404.html") {
      errors.push(`${relative}: falta canonical.`);
    }
    if (canonical) {
      if (canonicals.has(canonical)) {
        errors.push(
          `${relative}: canonical duplicada con ${canonicals.get(canonical)}.`
        );
      }
      canonicals.set(canonical, relative);
    }

    for (const match of source.matchAll(
      /\b(?:href|src)=["']([^"'#]+)["']/giu
    )) {
      const target = internalTarget(htmlFile, match[1]);
      if (target && !(await exists(target))) {
        errors.push(
          `${relative}: recurso interno inexistente ${match[1]}.`
        );
      }
    }

    for (const match of source.matchAll(
      /<a\b([^>]*\btarget=["']_blank["'][^>]*)>/giu
    )) {
      if (!/\brel=["'][^"']*noreferrer/iu.test(match[1])) {
        errors.push(
          `${relative}: enlace externo con target=_blank sin noreferrer.`
        );
      }
    }
  }

  if (errors.length) {
    throw new Error(`Comprobación de sitio fallida:\n- ${errors.join("\n- ")}`);
  }

  console.log(
    `Comprobación de sitio superada: ${htmlFiles.length} páginas y ${files.length} archivos revisados.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runSiteChecks();
}
