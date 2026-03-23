import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/validation-service", () => ({
  persistSetupIntentResult: vi.fn(),
}));
vi.mock("@/lib/abuse", () => ({
  registerVerificationOutcome: vi.fn(),
}));

describe("POST /api/finalize-validation", () => {
  it("accepts setupIntentId only (email from Stripe metadata)", async () => {
    const service = await import("@/lib/validation-service");
    vi.mocked(service.persistSetupIntentResult).mockResolvedValue({
      id: "v1",
      email: "user@example.com",
      status: "succeeded",
      verified: true,
      accessGranted: true,
      requiresAction: false,
      message: "ok",
      stripeSetupIntentId: "seti_1",
      stripePaymentMethodId: "pm_1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      stripeSubscriptionStatus: "active",
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/finalize-validation", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ setupIntentId: "seti_1" }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("succeeded");
    expect(service.persistSetupIntentResult).toHaveBeenCalledWith("seti_1", undefined);
  });

  it("returns 400 for invalid setup intent id", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/finalize-validation", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ setupIntentId: "bad" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
