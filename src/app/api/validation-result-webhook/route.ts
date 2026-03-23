import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { persistSetupIntentResult } from "@/lib/validation-service";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const env = getServerEnv();

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "setup_intent.succeeded" || event.type === "setup_intent.setup_failed") {
      const setupIntent = event.data.object;
      // Email optional: resolved from SetupIntent.metadata inside persistSetupIntentResult.
      await persistSetupIntentResult(setupIntent.id, setupIntent.metadata?.email);
    }

    logInfo("Webhook processed", { eventType: event.type, eventId: event.id });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logError("Webhook processing failed", { error });
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
