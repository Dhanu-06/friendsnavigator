// src/utils/openAppOrFallback.ts
export async function openAppOrFallback({
  appUrl,
  androidIntentUrl,
  fallbackUrl,
  timeout = 800,
}: {
  appUrl?: string;
  androidIntentUrl?: string;
  fallbackUrl: string;
  timeout?: number;
}) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      window.location.href = fallbackUrl;
      return resolve();
    }

    let handled = false;
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes("android");

    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        handled = true;
        cleanup();
        resolve();
      }
    };

    const onBlur = () => {
      handled = true;
      cleanup();
      resolve();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    const timer = setTimeout(() => {
      if (!handled) {
        cleanup();
        window.open(fallbackUrl, "_blank");
        resolve();
      }
    }, timeout);

    try {
      if (isAndroid && androidIntentUrl) {
        window.location.href = androidIntentUrl;
      } else if (appUrl) {
        window.location.href = appUrl;
      } else {
        window.location.href = fallbackUrl;
      }
    } catch {
      clearTimeout(timer);
      cleanup();
      window.open(fallbackUrl, "_blank");
      resolve();
    }
  });
}
