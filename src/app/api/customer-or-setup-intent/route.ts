import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCustomerAndSetupIntent } from "@/lib/validation-service";
import { assertNotBlocked } from "@/lib/abuse";
import { createIntentSchema } from "@/lib/validators";
import { getIpAddress, assertSameOrigin } from "@/lib/request";
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
    const limit = checkRateLimit(`create-intent:${ip}`);
    if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

    const payload = await request.json();
    const { email } = createIntentSchema.parse(payload);
    const blockState = await assertNotBlocked(email, ip);
    if (blockState.blocked) {
      return tooManyRequests(blockState.retryAfterMs);
    }

    const minuteBucket = Math.floor(Date.now() / 60_000);
    const idempotencyKey = `setup-${email}-${ip}-${minuteBucket}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );

    const result = await createCustomerAndSetupIntent(email, idempotencyKey);
    logInfo("SetupIntent created", {
      customerId: result.customerId,
      setupIntentId: result.setupIntentId,
      email,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid request body.");
    }
    logError("Failed to create setup intent", { error });
    return internalServerError();
  }
}
