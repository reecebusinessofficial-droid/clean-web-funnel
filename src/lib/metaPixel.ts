/** Meta Pixel helpers — relies on the global script in `src/routes/__root.tsx`. */

export function trackMetaInitiateCheckout(): void {
  if (typeof window === "undefined") return;
  const { fbq } = window;
  if (typeof fbq !== "function") return;
  fbq("track", "InitiateCheckout", {
    value: 19.99,
    currency: "GBP",
    content_ids: ["clean_premium"],
    content_type: "product",
  });
}

export function trackMetaPurchase(): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  window.fbq("track", "Purchase", {
    value: 19.99,
    currency: "GBP",
    content_ids: ["clean_premium"],
    content_type: "product",
  });
}
