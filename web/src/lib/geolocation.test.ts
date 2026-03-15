import { afterEach, describe, expect, it, vi } from "vitest";

import { SOCHI_CENTER, requestDeviceLocation } from "@/lib/geolocation";

describe("requestDeviceLocation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to Sochi when permission is denied", async () => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const getCurrentPosition = vi.fn((_success, error) =>
      error({ message: "Permission denied" }),
    );
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
    });

    const result = await requestDeviceLocation();

    expect(result.status).toBe("denied");
    if ("lat" in result && "lng" in result) {
      expect(result.lat).toBe(SOCHI_CENTER.lat);
      expect(result.lng).toBe(SOCHI_CENTER.lng);
    } else {
      throw new Error("expected denied location fallback coordinates");
    }
  });

  it("requests geolocation immediately when permission state is prompt", async () => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const query = vi.fn().mockResolvedValue({ state: "prompt" });
    const getCurrentPosition = vi.fn((success) =>
      success({
        coords: {
          latitude: 43.58,
          longitude: 39.72,
          accuracy: 15,
        },
      }),
    );
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
      permissions: { query },
    });

    const result = await requestDeviceLocation("auto");

    expect(result.status).toBe("granted");
    expect(query).toHaveBeenCalled();
    expect(getCurrentPosition).toHaveBeenCalled();
  });

  it("keeps prompt CTA when browser still reports prompt after auto geolocation failure", async () => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const query = vi.fn().mockResolvedValue({ state: "prompt" });
    const getCurrentPosition = vi.fn((_success, error) =>
      error({ message: "User did not interact with geolocation prompt" }),
    );
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
      permissions: { query },
    });

    const result = await requestDeviceLocation("auto");

    expect(result.status).toBe("prompt");
    expect(query).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition).toHaveBeenCalled();
  });
});
