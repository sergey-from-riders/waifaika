export type LocationState =
  | { status: "idle" | "pending" }
  | { status: "prompt"; reason: string; lat: number; lng: number }
  | { status: "granted"; lat: number; lng: number; accuracy: number }
  | { status: "denied"; reason: string; lat: number; lng: number };

export const SOCHI_CENTER = { lat: 43.5854823, lng: 39.7231090 };

export async function requestDeviceLocation(mode: "auto" | "user" = "auto"): Promise<LocationState> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      status: "denied",
      reason: "Геолокация работает только в HTTPS / secure context",
      ...SOCHI_CENTER,
    };
  }
  if (!("geolocation" in navigator)) {
    return { status: "denied", reason: "Геолокация недоступна в браузере", ...SOCHI_CENTER };
  }

  const permission = await readLocationPermissionState();
  if (permission === "denied") {
    return {
      status: "denied",
      reason: "Доступ к геолокации уже запрещён в настройках браузера или сайта",
      ...SOCHI_CENTER,
    };
  }

  if (mode === "auto" && typeof document !== "undefined" && document.visibilityState === "hidden") {
    await waitUntilVisible();
  }

  return await new Promise<LocationState>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: "granted",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        void (async () => {
          const permissionAfterFailure = await readLocationPermissionState();
          if (permissionAfterFailure === "prompt") {
            resolve({
              status: "prompt",
              reason:
                mode === "auto"
                  ? "Браузер не показал запрос сам. Нажмите «Где я», чтобы повторить запрос геопозиции"
                  : "Браузер ждёт действие по геолокации. Нажмите «Где я» ещё раз",
              ...SOCHI_CENTER,
            });
            return;
          }
          resolve({
            status: "denied",
            reason: error.message || "Доступ к геопозиции отклонён",
            ...SOCHI_CENTER,
          });
        })();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: mode === "auto" ? 10_000 : 15_000,
      },
    );
  });
}

export function startLocationWatch(
  onSuccess: (location: Extract<LocationState, { status: "granted" }>) => void,
  onError?: (location: Extract<LocationState, { status: "denied" }>) => void,
) {
  if (!("geolocation" in navigator)) {
    onError?.({
      status: "denied",
      reason: "Геолокация недоступна в браузере",
      ...SOCHI_CENTER,
    });
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) =>
      onSuccess({
        status: "granted",
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    (error) =>
      onError?.({
        status: "denied",
        reason: error.message || "Не удалось обновить геопозицию",
        ...SOCHI_CENTER,
      }),
    {
      enableHighAccuracy: true,
      maximumAge: 1_000,
      timeout: 20_000,
    },
  );
}

export function stopLocationWatch(watchId: number | null | undefined) {
  if (watchId == null || !("geolocation" in navigator)) {
    return;
  }
  navigator.geolocation.clearWatch(watchId);
}

export async function readLocationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (!("permissions" in navigator) || typeof navigator.permissions?.query !== "function") {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
}

type PermissionState = "granted" | "prompt" | "denied";

function waitUntilVisible() {
  if (typeof document === "undefined" || document.visibilityState === "visible") {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      document.removeEventListener("visibilitychange", onVisible);
      resolve();
    };
    document.addEventListener("visibilitychange", onVisible);
  });
}
