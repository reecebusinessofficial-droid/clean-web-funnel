import { getStripeClient } from "./client";

const INTRO_PRICE_ID = "price_1TcAYk1Wk1spUrOQTJF0jk9p";

export type CreateCheckoutSessionInput = {
  stripeSecretKey: string;
  stripeProductId: string;
  origin: string;
};

export type CreateCheckoutSessionResult = {
  url: string;
  sessionId: string;
};

/**
 * Creates a one-time hosted Checkout Session for the intro charge.
 * Saves the payment method with setup_future_usage: "off_session" so
 * the customer can be billed again later without any user interaction.
 */
export async function createCheckoutSession({
  stripeSecretKey,
  origin,
}: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
  const stripe = getStripeClient(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
    payment_method_types: ["card"],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    allow_promotion_codes: false,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a redirect URL");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}
