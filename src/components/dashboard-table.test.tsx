import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardTable } from "@/components/dashboard-table";
import type { ValidationRecord } from "@/lib/types";

const rows: ValidationRecord[] = [
  {
    id: "v_1",
    email: "qa@example.com",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("DashboardTable", () => {
  it("renders rows with safe card metadata", () => {
    render(<DashboardTable rows={rows} />);
    expect(screen.getByText("qa@example.com")).toBeInTheDocument();
    expect(screen.getByText("visa •••• 4242 (12/2030)")).toBeInTheDocument();
  });
});
