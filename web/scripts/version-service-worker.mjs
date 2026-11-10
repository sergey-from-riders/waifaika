import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const source = await readFile("public/sw.js", "utf8");
const manifest = await readFile("dist/asset-manifest.json");
const index = await readFile("dist/index.html");
const version = createHash("sha256")
  .update(source)
  .update(manifest)
  .update(index)
  .digest("hex")
  .slice(0, 16);
await writeFile("dist/sw.js", source.replaceAll("__BUILD_VERSION__", version));
console.log(`Service worker release: ${version}`);
