import type Stripe from "stripe";

import { getStripeClient } from "./client";
import { getActiveRecurringPrice } from "./getActiveRecurringPrice";

const TRIAL_DAYS = 3;
const INTRO_UNIT_AMOUNT = 100;

export type CreateCheckoutSessionInput = {
  stripeSecretKey: string;
  stripeProductId: string;
  origin: string;
};

export type CreateCheckoutSessionResult = {
  url: string;
  sessionId: string;
};

export async function createCheckoutSession({
  stripeSecretKey,
  stripeProductId,
  origin,
}: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
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

  // Do not pre-create a Customer without an address — Stripe Tax rejects that when
  // automatic tax is enabled (Dashboard default or explicit). Checkout creates the
  // Customer and collects billing details on the hosted page instead.
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
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
