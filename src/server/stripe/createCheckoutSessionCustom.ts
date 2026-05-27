import type Stripe from "stripe";

import { getStripeClient } from "./client";
import { getActiveRecurringPrice } from "./getActiveRecurringPrice";

/** Mirrors hosted Checkout session (createCheckoutSession.ts) for Elements / Apple Pay. */
const TRIAL_DAYS = 3;
const INTRO_UNIT_AMOUNT = 100;

export type CreateCheckoutSessionCustomInput = {
  stripeSecretKey: string;
  stripeProductId: string;
  origin: string;
};

export type CreateCheckoutSessionCustomResult = {
  clientSecret: string;
  sessionId: string;
};

/**
 * Creates a Checkout Session in `ui_mode: "custom"` so the client can mount
 * Stripe.js Checkout (Express Checkout Element) with the same subscription,
 * intro charge, and trial as hosted Checkout — without changing hosted URLs.
 */
export async function createCheckoutSessionCustom({
  stripeSecretKey,
  stripeProductId,
  origin,
}: CreateCheckoutSessionCustomInput): Promise<CreateCheckoutSessionCustomResult> {
  const stripe = getStripeClient(stripeSecretKey);
  const recurringPrice = await getActiveRecurringPrice(stripeSecretKey, stripeProductId);

  const introLineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: recurringPrice.currency,
      unit_amount: INTRO_UNIT_AMOUNT,
      product_data: {
        name: "3-day introductory access",
      },
    },
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ui_mode: "custom",
    line_items: [
      {
        price: recurringPrice.id,
        quantity: 1,
      },
      introLineItem,
    ],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        funnel: "clean_web",
        intro_payment: "true",
      },
    },
    automatic_tax: { enabled: false },
    /** Required for `ui_mode: custom` when wallet / redirect PMs may be used. */
    return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) {
    throw new Error("Checkout Session did not return client_secret for ui_mode=custom");
  }

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}
