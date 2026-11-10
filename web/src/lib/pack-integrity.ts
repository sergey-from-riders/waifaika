import type { OfflinePack } from "./types";

/** Validate before replacing a previously usable map in persistent storage. */
export async function validatePack(
  blob: Blob,
  pack: Pick<OfflinePack, "size_bytes" | "version_hash">,
) {
  if (blob.size !== pack.size_bytes || blob.size < 127)
    throw new Error("Incomplete map download");
  const buffer = await blob.arrayBuffer();
  const header = new Uint8Array(buffer, 0, 8);
  if (
    new TextDecoder().decode(header.slice(0, 7)) !== "PMTiles" ||
    header[7] !== 3
  ) {
    throw new Error("Unsupported map format");
  }
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== pack.version_hash.toLowerCase())
    throw new Error("Map checksum mismatch");
}
