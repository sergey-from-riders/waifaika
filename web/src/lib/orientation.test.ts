import { describe, expect, it } from "vitest";

import { extractCompassHeading } from "@/lib/orientation";

describe("extractCompassHeading", () => {
  it("prefers iOS compass heading when present", () => {
    expect(
      extractCompassHeading({
        webkitCompassHeading: 42,
        alpha: 270,
      } as DeviceOrientationEvent & { webkitCompassHeading: number }),
    ).toBe(42);
  });

  it("falls back to alpha-based heading on other browsers", () => {
    expect(
      extractCompassHeading({
        alpha: 90,
      } as DeviceOrientationEvent),
    ).toBe(270);
  });
});
