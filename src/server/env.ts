export type ServerEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRODUCT_ID?: string;
  SITE_URL?: string;
};

export function readServerEnv(env: unknown): {
  stripeSecretKey: string;
  stripeProductId: string;
  siteUrl?: string;
} {
  const bindings = (env ?? {}) as ServerEnv;
  const stripeSecretKey =
    bindings.STRIPE_SECRET_KEY ?? (typeof process !== "undefined" ? process.env.STRIPE_SECRET_KEY : undefined);

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return {
    stripeSecretKey,
    stripeProductId:
      bindings.STRIPE_PRODUCT_ID ??
      (typeof process !== "undefined" ? process.env.STRIPE_PRODUCT_ID : undefined) ??
      "prod_UbINUYGhr1SUUa",
    siteUrl:
      bindings.SITE_URL ?? (typeof process !== "undefined" ? process.env.SITE_URL : undefined),
  };
}

export function resolveSiteOrigin(request: Request, siteUrl?: string): string {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  return new URL(request.url).origin;
}
