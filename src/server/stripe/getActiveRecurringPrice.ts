import type Stripe from "stripe";

import { getStripeClient } from "./client";

const WEEKLY_INTERVALS = new Set<Stripe.Price.Recurring.Interval>(["week"]);

export async function getActiveRecurringPrice(
  stripeSecretKey: string,
  productId: string,
): Promise<Stripe.Price> {
  const stripe = getStripeClient(stripeSecretKey);

  const { data: prices } = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 20,
    expand: ["data.product"],
  });

  if (!prices.length) {
    throw new Error(`No active recurring price found for product ${productId}`);
  }

  const weekly = prices.find((price) => price.recurring && WEEKLY_INTERVALS.has(price.recurring.interval));
  return weekly ?? prices[0];
}
