import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerVerificationOutcome } from "@/lib/abuse";
import { persistSetupIntentResult } from "@/lib/validation-service";
import { finalizeValidationSchema } from "@/lib/validators";
import { assertSameOrigin, getIpAddress } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { badRequest, internalServerError, tooManyRequests } from "@/lib/http";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const ip = getIpAddress(request);
    const limit = checkRateLimit(`finalize-validation:${ip}`);
    if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

    const payload = await request.json();
    const { setupIntentId, email } = finalizeValidationSchema.parse(payload);

    const result = await persistSetupIntentResult(setupIntentId, email);
    await registerVerificationOutcome(result.email, ip, Boolean(result.verified));
    logInfo("Validation finalized", {
      setupIntentId: result.stripeSetupIntentId,
      customerId: result.stripeCustomerId,
      verified: result.verified,
      subscriptionId: result.stripeSubscriptionId,
      status: result.status,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid request body.");
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Invalid server environment")) {
      return NextResponse.json(
        { error: "Server configuration is incomplete. Please set required environment variables." },
        { status: 503 },
      );
    }
    if (message.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is unavailable. Please check DATABASE_URL and database status." },
        { status: 503 },
      );
    }
    logError("Failed to finalize validation", { error });
    return internalServerError();
  }
}
