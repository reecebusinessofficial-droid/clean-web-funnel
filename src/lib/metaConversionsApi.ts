/**
 * Meta Conversions API — server-side event tracking.
 * Sends events directly to Meta from the Cloudflare Worker,
 * bypassing browser privacy restrictions.
 */

const PIXEL_ID = "27208262335528586";
const API_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

type ConversionsApiEvent = {
  event_name: string;
  event_time: number;
  event_source_url?: string;
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
  };
};

export async function sendMetaConversionsEvent({
  accessToken,
  event,
}: {
  accessToken: string;
  event: ConversionsApiEvent;
}): Promise<void> {
  try {
    await fetch(`${API_URL}?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
      }),
    });
  } catch (e) {
    console.error("[MetaConversionsAPI] Failed to send event", e);
  }
}

export function buildPurchaseEvent({
  request,
  fbc,
  fbp,
}: {
  request: Request;
  fbc?: string;
  fbp?: string;
}): ConversionsApiEvent {
  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: request.url,
    user_data: {
      client_ip_address: request.headers.get("cf-connecting-ip") ?? undefined,
      client_user_agent: request.headers.get("user-agent") ?? undefined,
      fbc,
      fbp,
    },
    custom_data: {
      value: 19.99,
      currency: "GBP",
      content_ids: ["clean_premium"],
      content_type: "product",
    },
  };
}

export function buildInitiateCheckoutEvent({
  request,
  fbc,
  fbp,
}: {
  request: Request;
  fbc?: string;
  fbp?: string;
}): ConversionsApiEvent {
  return {
    event_name: "InitiateCheckout",
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: request.url,
    user_data: {
      client_ip_address: request.headers.get("cf-connecting-ip") ?? undefined,
      client_user_agent: request.headers.get("user-agent") ?? undefined,
      fbc,
      fbp,
    },
    custom_data: {
      value: 19.99,
      currency: "GBP",
      content_ids: ["clean_premium"],
      content_type: "product",
    },
  };
}
