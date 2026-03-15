import { describe, expect, it, vi } from "vitest";

import { registerServiceWorker } from "@/lib/pwa";

describe("registerServiceWorker", () => {
  it("does not crash when serviceWorker key exists without an implementation", () => {
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    expect(() => registerServiceWorker()).not.toThrow();

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: original,
    });
  });

  it("registers a worker when the API is available", () => {
    const register = vi.fn().mockResolvedValue({ update: vi.fn().mockResolvedValue(undefined) });
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        controller: null,
      },
    });

    registerServiceWorker();

    expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: original,
    });
  });
});
