import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    validation: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/validations", () => {
  it("returns validation rows", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.validation.findMany).mockResolvedValue([
      {
        id: "v1",
        email: "a@example.com",
        stripeCustomerId: "cus_1",
        stripeSetupIntentId: "seti_1",
        stripePaymentMethodId: "pm_1",
        stripeSubscriptionId: "sub_1",
        stripeSubscriptionStatus: "active",
        status: "succeeded",
        verified: true,
        requiresAction: false,
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2030,
        errorCode: null,
        errorMessage: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(1);
    expect(payload[0].email).toBe("a@example.com");
  });
});
