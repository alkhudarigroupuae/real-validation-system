import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export const getStripe = () => {
  if (stripeClient) return stripeClient;
  const env = getServerEnv();
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    appInfo: {
      name: "card-validation-app",
      version: "1.0.0",
    },
  });
  return stripeClient;
};
