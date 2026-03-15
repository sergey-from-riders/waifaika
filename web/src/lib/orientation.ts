import { normalizeDegrees } from "@/lib/utils";

type OrientationPermissionResponse = {
  status: "granted" | "denied";
  reason?: string;
};

type OrientationEventWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number | null;
};

type DeviceOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export async function requestOrientationAccess(): Promise<OrientationPermissionResponse> {
  if (typeof window === "undefined") {
    return { status: "denied", reason: "Компас доступен только в браузере устройства" };
  }

  const OrientationCtor = window.DeviceOrientationEvent as DeviceOrientationConstructor | undefined;
  if (!OrientationCtor) {
    return { status: "denied", reason: "Компас недоступен в этом браузере" };
  }

  if (typeof OrientationCtor.requestPermission === "function") {
    try {
      const permission = await OrientationCtor.requestPermission();
      if (permission === "granted") {
        return { status: "granted" };
      }
      return { status: "denied", reason: "Доступ к компасу отклонён в настройках iPhone" };
    } catch {
      return {
        status: "denied",
        reason: "iPhone выдаёт доступ к компасу только после явного тапа по кнопке",
      };
    }
  }

  return { status: "granted" };
}

export function startCompassWatch(onHeading: (heading: number) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const heading = extractCompassHeading(event as OrientationEventWithWebkit);
    if (heading == null) {
      return;
    }
    onHeading(heading);
  };

  window.addEventListener("deviceorientationabsolute", handler, true);
  window.addEventListener("deviceorientation", handler, true);

  return () => {
    window.removeEventListener("deviceorientationabsolute", handler, true);
    window.removeEventListener("deviceorientation", handler, true);
  };
}

export function extractCompassHeading(event: OrientationEventWithWebkit) {
  if (typeof event.webkitCompassHeading === "number") {
    return normalizeDegrees(event.webkitCompassHeading);
  }
  if (typeof event.alpha === "number") {
    return normalizeDegrees(360 - event.alpha);
  }
  return null;
}
