import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleCreateCheckoutSession } from "./server/handlers/createCheckoutSessionHandler";
import { handleCreateCheckoutSessionCustom } from "./server/handlers/createCheckoutSessionCustomHandler";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === "/.well-known/apple-developer-merchantid-domain-association") {
        const fileContent = await fetch(
          "https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association",
        );
        return new Response(await fileContent.text(), {
          headers: { "content-type": "text/plain" },
        });
      }
      if (pathname === "/api/meta-purchase") {
        const accessToken = (env as Record<string, string>).META_CONVERSIONS_API_TOKEN;
        if (!accessToken) return new Response("Missing token", { status: 500 });

        const cookies = request.headers.get("cookie") ?? "";
        const fbc = cookies.match(/_fbc=([^;]+)/)?.[1];
        const fbp = cookies.match(/_fbp=([^;]+)/)?.[1];

        const { buildPurchaseEvent, sendMetaConversionsEvent } = await import("./lib/metaConversionsApi");
        const event = buildPurchaseEvent({ request, fbc, fbp });
        await sendMetaConversionsEvent({ accessToken, event });
        return new Response("ok", { status: 200 });
      }

      if (pathname === "/api/create-checkout-session") {
        return handleCreateCheckoutSession(request, env);
      }
      if (pathname === "/api/create-checkout-session-custom") {
        return handleCreateCheckoutSessionCustom(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
