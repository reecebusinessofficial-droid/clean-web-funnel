import { getStripeClient } from "./client";

export type CreateCheckoutSessionCustomInput = {
  stripeSecretKey: string;
  stripeProductId: string;
  origin: string;
};

export type CreateCheckoutSessionCustomResult = {
  clientSecret: string;
  sessionId: string;
};

const INTRO_PRICE_ID = "price_1TcAYk1Wk1spUrOQTJF0jk9p";

/**
 * Creates a one-time Payment Intent for the intro charge (£12.99).
 * Saves the payment method with setup_future_usage: "off_session" so
 * the customer can be billed again later without any user interaction.
 */
export async function createCheckoutSessionCustom({
  stripeSecretKey,
  origin,
}: CreateCheckoutSessionCustomInput): Promise<CreateCheckoutSessionCustomResult> {
  const stripe = getStripeClient(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "elements",
    line_items: [
      {
        price: INTRO_PRICE_ID,
        quantity: 1,
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: {
        funnel: "clean_web",
        intro_payment: "true",
      },
    },
    automatic_tax: { enabled: false },
    return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) {
    throw new Error("Checkout Session did not return client_secret");
  }

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}
