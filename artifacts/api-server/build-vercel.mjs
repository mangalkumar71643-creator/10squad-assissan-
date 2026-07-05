import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(artifactDir, "api");

// NODE_ENV=production is always set on Vercel, and src/lib/logger.ts only
// configures pino's worker-thread-based "pino-pretty" transport when NOT in
// production — so this bundle never needs pino's transport/worker files.
async function buildVercelFunction() {
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(apiDir, "index.mjs"),
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "pg-native",
      "pino-pretty",
    ],
    sourcemap: false,
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildVercelFunction().catch((err) => {
  console.error(err);
  process.exit(1);
});
