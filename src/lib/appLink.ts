// src/lib/appLink.ts
/**
 * openAppOrFallback
 * Attempts to open a native app (via appUrl / intentUrl). If the app isn't installed,
 * falls back to the provided webUrl (booking page or maps URL).
 *
 * Notes:
 * - Use appUrl for custom schemes / universal links if available.
 * - Use intentUrl for Android stronger fallback to Play Store.
 * - webUrl must be provided for a stable fallback.
 */

type LinkArgs = {
  appUrl?: string;       // e.g. "uber://?action=setPickup&..."
  intentUrl?: string;    // e.g. "intent://...#Intent;package=com.ubercab;end"
  webUrl: string;        // always provide: e.g. https://m.uber.com/ul/...
  playStoreUrl?: string; // optional fallback store link
};

export async function openAppOrFallback({ appUrl, intentUrl, webUrl, playStoreUrl }: LinkArgs) {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const isiOS = /iphone|ipad|ipod/i.test(ua);

  // If we have an intentUrl on Android, prefer that (strong fallback to Play)
  if (isAndroid && intentUrl) {
    try {
      window.location.href = intentUrl;
      return;
    } catch {
      // continue to attempt appUrl/webUrl below
    }
  }

  // Try opening appUrl (scheme or universal link)
  if (appUrl) {
    // Attempt to open the app. Many mobile browsers will attempt to open the app.
    // If it doesn't open, we'll fallback to webUrl after a short delay.
    const now = Date.now();
    let didHide = false;

    const onPageHide = () => { didHide = true; };
    window.addEventListener("pagehide", onPageHide);

    // Try to open the app
    window.location.href = appUrl;

    // Wait ~1200ms; if page not hidden (app not opened), do fallback
    await new Promise((resolve) => setTimeout(resolve, 1200));
    window.removeEventListener("pagehide", onPageHide);

    if (didHide) return; // app opened
  }

  // As final fallback, go to web booking page or store
  try {
    window.location.href = webUrl;
  } catch {
    // last resort: open PlayStore / AppStore if provided
    if (playStoreUrl) window.location.href = playStoreUrl;
  }
}
