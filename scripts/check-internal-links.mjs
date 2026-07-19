import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return files.flat();
}

function routeFromFile(file, kind) {
  const appRelative = relative(join(root, "src/app"), file).split(sep).join("/");
  const suffix = kind === "page" ? "/page.tsx" : "/route.ts";
  const raw = appRelative === `${kind}.tsx` ? "" : appRelative.replace(suffix, "");
  return `/${raw}`.replace(/\/$/, "") || "/";
}

const appFiles = await walk(join(root, "src/app"));
const routes = new Set([
  ...appFiles.filter((file) => file.endsWith("/page.tsx")).map((file) => routeFromFile(file, "page")),
  ...appFiles.filter((file) => file.endsWith("/route.ts")).map((file) => routeFromFile(file, "route")),
  "/opengraph-image",
  "/twitter-image",
]);

const sourceFiles = [
  ...(await walk(join(root, "src"))).filter((file) => /\.(?:ts|tsx)$/.test(file)),
  ...(await walk(join(root, "docs"))).filter((file) => file.endsWith(".md")),
  join(root, "README.md"),
];

const references = new Map();
const patterns = [
  /(?:href|url)=["'](\/[A-Za-z0-9_./?#-]*)["']/g,
  /href:\s*["'](\/[A-Za-z0-9_./?#-]*)["']/g,
  /https:\/\/rulewallet\.vercel\.app(\/[A-Za-z0-9_./?#-]*)/g,
];

for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const path = match[1].split(/[?#]/)[0].replace(/\/$/, "") || "/";
      if (!references.has(path)) references.set(path, new Set());
      references.get(path).add(relative(root, file));
    }
  }
}

const missing = [...references.entries()].filter(([path]) => {
  if (path.startsWith("/_next") || path.includes("${")) return false;
  if (routes.has(path)) return false;
  return ![...routes].some((route) =>
    route.includes("[") &&
    new RegExp(`^${route.replace(/\[[^/]+\]/g, "[^/]+")}$`).test(path),
  );
});

if (missing.length > 0) {
  for (const [path, files] of missing) {
    console.error(`${path} referenced by ${[...files].join(", ")}`);
  }
  process.exit(1);
}

console.log(`Verified ${references.size} internal public links against ${routes.size} application routes.`);
