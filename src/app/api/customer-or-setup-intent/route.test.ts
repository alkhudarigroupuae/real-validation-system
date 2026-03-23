import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/validation-service", () => ({
  createCustomerAndSetupIntent: vi.fn(),
}));
vi.mock("@/lib/abuse", () => ({
  assertNotBlocked: vi.fn().mockResolvedValue({ blocked: false, retryAfterMs: 0 }),
}));

describe("POST /api/customer-or-setup-intent", () => {
  it("returns 400 for invalid email", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/customer-or-setup-intent", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ email: "invalid" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns setup intent payload on success", async () => {
    const service = await import("@/lib/validation-service");
    vi.mocked(service.createCustomerAndSetupIntent).mockResolvedValue({
      customerId: "cus_1",
      setupIntentId: "seti_1",
      clientSecret: "seti_secret_1",
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/customer-or-setup-intent", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ email: "valid@example.com" }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.customerId).toBe("cus_1");
  });
});
