// src/utils/openAppOrFallback.ts
// Robust deep-link opener that tries app URL first, then opens fallback after ~800ms.
// Uses visibilitychange to detect if the browser was backgrounded (app opened).
// Supports explicit androidIntentUrl (intent://…) if provided.

type OpenOptions = {
  /** Primary app URL (app scheme or universal link). Example: "uber://?action=setPickup..." */
  appUrl?: string;
  /** Android intent URL. Example: "intent://...#Intent;package=com.ubercab;scheme=uber;end" */
  androidIntentUrl?: string;
  /** Web fallback URL (https)... opened if the app doesn't open */
  fallbackUrl: string;
  /** Timeout in ms to wait before opening fallback (default 800ms) */
  timeoutMs?: number;
};

export async function openAppOrFallback(options: OpenOptions) {
  const { appUrl, androidIntentUrl, fallbackUrl } = options;
  const timeoutMs = options.timeoutMs ?? 800;

  if (typeof window === "undefined") {
    // Server-side safeguard
    window.location.href = fallbackUrl;
    return;
  }

  // Helper that actually navigates to a URL
  const navigate = (url: string) => {
    try {
      // Best-effort navigation
      window.location.href = url;
    } catch (e) {
      // Fallback to open in new tab
      window.open(url, "_blank");
    }
  };

  // If no appUrl/androidIntent provided, just open fallback
  if (!appUrl && !androidIntentUrl) {
    navigate(fallbackUrl);
    return;
  }

  let fallbackTimer: number | undefined;
  let handled = false;

  const cleanUp = () => {
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("blur", onWindowBlur);
  };

  const onSuccessDetected = () => {
    handled = true;
    cleanUp();
  };

  const onVisibilityChange = () => {
    // Some mobile browsers will hide the page when opening the native app
    if (document.visibilityState === "hidden") {
      onSuccessDetected();
    }
  };

  const onPageHide = () => onSuccessDetected();
  const onWindowBlur = () => {
    // Some browsers may blur on app open
    onSuccessDetected();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("blur", onWindowBlur);

  // Start fallback timer: if nothing detected within timeout, open fallback
  fallbackTimer = window.setTimeout(() => {
    if (!handled) {
      cleanUp();
      navigate(fallbackUrl);
    }
  }, timeoutMs);

  // For Android, prefer the intent URL if provided (works better on Chrome)
  const isAndroid = /Android/i.test(navigator.userAgent);
  try {
    if (isAndroid && androidIntentUrl) {
      // Setting location to intent URL will either open the app or show Play Store
      navigate(androidIntentUrl);
    } else if (appUrl) {
      // Universal link / custom scheme attempts
      navigate(appUrl);
    }
  } catch (e) {
    // If any error, ensure fallback after cleanup
    cleanUp();
    navigate(fallbackUrl);
  }
}
export default openAppOrFallback;
