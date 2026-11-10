// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validatePack } from "./pack-integrity";

describe("offline package integrity", () => {
  it("accepts exactly the downloaded version, rejects truncation and changed bytes", async () => {
    const bytes = new Uint8Array(127);
    bytes.set(new TextEncoder().encode("PMTiles"));
    bytes[7] = 3;
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const manifest = { size_bytes: 127, version_hash: hash };
    await expect(
      validatePack(new Blob([bytes]), manifest),
    ).resolves.toBeUndefined();
    await expect(
      validatePack(new Blob([bytes.slice(0, 100)]), manifest),
    ).rejects.toThrow("Incomplete");
    bytes[100] = 1;
    await expect(validatePack(new Blob([bytes]), manifest)).rejects.toThrow(
      "checksum",
    );
    bytes[7] = 2;
    await expect(validatePack(new Blob([bytes]), manifest)).rejects.toThrow(
      "format",
    );
  });
});
