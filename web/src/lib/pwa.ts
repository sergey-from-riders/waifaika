import { isIOS, isStandalone } from "@/lib/utils";

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: DeferredPrompt | null = null;

export function registerServiceWorker() {
  if (navigator.serviceWorker?.register) {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        if (!navigator.onLine || !navigator.serviceWorker?.controller) {
          return;
        }
        try {
          await registration.update();
        } catch (error) {
          if (!navigator.serviceWorker?.controller) {
            console.error("service worker registration failed", error);
          }
        }
      })
      .catch((error) => {
        if (!navigator.serviceWorker?.controller) {
          console.error("service worker registration failed", error);
        }
      });
  }
}

export function subscribeInstallPrompt(onChange: () => void) {
  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredPrompt;
    onChange();
  };
  const onInstalled = () => {
    deferredPrompt = null;
    onChange();
  };
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function getInstallState() {
  return {
    canInstall: Boolean(deferredPrompt),
    isIOS: isIOS(),
    isStandalone: isStandalone(),
  };
}

export async function triggerInstall() {
  if (!deferredPrompt) {
    return false;
  }
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome === "accepted";
}
