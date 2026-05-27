/** Meta Pixel helpers — relies on the global script in `src/routes/__root.tsx`. */

export function trackMetaInitiateCheckout(): void {
  if (typeof window === "undefined") return;
  const { fbq } = window;
  if (typeof fbq !== "function") return;
  fbq("track", "InitiateCheckout");
}

export function trackMetaPurchase(): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  // TODO: set value/currency from verified Stripe session or webhook data.
  window.fbq("track", "Purchase", {
    value: 20,
    currency: "GBP",
  });
}
