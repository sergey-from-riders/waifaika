import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = path.join(rootDir, "node_modules", "swagger-ui-dist");
const targetDir = path.join(rootDir, "public", "swagger-ui");
const files = ["swagger-ui.css", "swagger-ui-bundle.js"];

await mkdir(targetDir, { recursive: true });

await Promise.all(
  files.map((fileName) => copyFile(path.join(sourceDir, fileName), path.join(targetDir, fileName))),
);

console.log(`Synced Swagger UI assets into ${path.relative(rootDir, targetDir)}`);
