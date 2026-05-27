import { createCheckoutSessionCustom } from "../stripe/createCheckoutSessionCustom";
import { readServerEnv, resolveSiteOrigin } from "../env";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function handleCreateCheckoutSessionCustom(
  request: Request,
  env: unknown,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { stripeSecretKey, stripeProductId, siteUrl } = readServerEnv(env);
    const origin = resolveSiteOrigin(request, siteUrl);

    const { clientSecret, sessionId } = await createCheckoutSessionCustom({
      stripeSecretKey,
      stripeProductId,
      origin,
    });

    return jsonResponse({ clientSecret, sessionId });
  } catch (error) {
    console.error("[create-checkout-session-custom]", error);

    const message =
      error instanceof Error ? error.message : "Unable to start checkout. Please try again.";

    const status = message.includes("not configured") ? 503 : 500;

    return jsonResponse({ error: message }, status);
  }
}
