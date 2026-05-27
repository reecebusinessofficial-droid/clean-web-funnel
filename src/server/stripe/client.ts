import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripeClient(secretKey: string): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeClient;
}
