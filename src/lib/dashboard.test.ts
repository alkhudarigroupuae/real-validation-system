import { describe, expect, it } from "vitest";
import { filterValidations } from "@/lib/dashboard";
import type { ValidationRecord } from "@/lib/types";

const baseRow: ValidationRecord = {
  id: "v_1",
  email: "customer@example.com",
  stripeCustomerId: "cus_123",
  stripeSetupIntentId: "seti_123",
  stripePaymentMethodId: "pm_123",
  stripeSubscriptionId: "sub_123",
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("filterValidations", () => {
  it("filters by email query", () => {
    const rows = [
      baseRow,
      { ...baseRow, id: "v_2", email: "other@example.com", stripeCustomerId: "cus_999" },
    ];
    const result = filterValidations(rows, "customer@", "all");
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("customer@example.com");
  });

  it("filters by status", () => {
    const rows = [
      baseRow,
      { ...baseRow, id: "v_2", status: "requires_action" },
      { ...baseRow, id: "v_3", status: "card_error" },
    ];
    const result = filterValidations(rows, "", "requires_action");
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("requires_action");
  });
});
