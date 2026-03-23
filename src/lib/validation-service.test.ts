import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { createCustomerAndSetupIntent, persistSetupIntentResult } from "@/lib/validation-service";

const mockDb = {
  validation: {
    upsert: vi.fn(),
  },
};

const makeStripe = () =>
  ({
    customers: {
      list: vi.fn(),
      create: vi.fn(),
    },
    setupIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    paymentMethods: {
      retrieve: vi.fn(),
      attach: vi.fn(),
    },
    subscriptions: {
      list: vi.fn(),
      create: vi.fn(),
    },
  }) as unknown as Stripe;

describe("validation service", () => {
  it("reuses existing customer and creates setup intent", async () => {
    const stripe = makeStripe();
    const deps = { stripe, db: mockDb as never };
    vi.mocked(stripe.customers.list).mockResolvedValue({
      data: [{ id: "cus_existing" }],
    } as never);
    vi.mocked(stripe.setupIntents.create).mockResolvedValue({
      id: "seti_1",
      client_secret: "seti_secret_1",
    } as never);

    const result = await createCustomerAndSetupIntent(
      "user@example.com",
      "setup_user_example",
      deps,
    );

    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        payment_method_types: ["card"],
        payment_method_options: {
          card: {
            request_three_d_secure: "automatic",
          },
        },
      }),
      { idempotencyKey: "setup_user_example" },
    );
    expect(result.customerId).toBe("cus_existing");
  });

  it("creates customer when email not found", async () => {
    const stripe = makeStripe();
    const deps = { stripe, db: mockDb as never };
    vi.mocked(stripe.customers.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: "cus_new" } as never);
    vi.mocked(stripe.setupIntents.create).mockResolvedValue({
      id: "seti_2",
      client_secret: "seti_secret_2",
    } as never);

    const result = await createCustomerAndSetupIntent("new@example.com", undefined, deps);
    expect(stripe.customers.create).toHaveBeenCalled();
    expect(result.customerId).toBe("cus_new");
  });

  it("persists safe metadata only and upserts by setup intent id", async () => {
    const stripe = makeStripe();
    const deps = { stripe, db: mockDb as never };

    vi.mocked(stripe.setupIntents.retrieve).mockResolvedValue({
      id: "seti_3",
      status: "succeeded",
      customer: "cus_abc",
      payment_method: "pm_abc",
      last_setup_error: null,
    } as never);

    vi.mocked(stripe.paymentMethods.retrieve).mockResolvedValue({
      id: "pm_abc",
      customer: "cus_abc",
      card: {
        brand: "visa",
        last4: "4242",
        exp_month: 12,
        exp_year: 2030,
      },
    } as never);
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(stripe.subscriptions.create).mockResolvedValue({
      id: "sub_abc",
      status: "active",
    } as never);

    mockDb.validation.upsert.mockResolvedValue({
      id: "v_3",
      stripeSetupIntentId: "seti_3",
      stripePaymentMethodId: "pm_abc",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_abc",
      stripeSubscriptionStatus: "active",
      email: "safe@example.com",
      verified: true,
      status: "succeeded",
    });

    await persistSetupIntentResult("seti_3", "safe@example.com", deps);

    expect(mockDb.validation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSetupIntentId: "seti_3" },
        create: expect.not.objectContaining({
          number: expect.anything(),
          cvc: expect.anything(),
        }),
      }),
    );
    expect(stripe.subscriptions.create).toHaveBeenCalled();
  });

  it("maps card errors to card_error status", async () => {
    const stripe = makeStripe();
    const deps = { stripe, db: mockDb as never };
    vi.mocked(stripe.setupIntents.retrieve).mockResolvedValue({
      id: "seti_4",
      status: "requires_payment_method",
      customer: "cus_4",
      payment_method: null,
      last_setup_error: {
        type: "card_error",
        code: "card_declined",
        message: "Your card was declined.",
      },
    } as never);

    mockDb.validation.upsert.mockResolvedValue({
      id: "v_4",
      stripeSetupIntentId: "seti_4",
      stripePaymentMethodId: null,
      stripeCustomerId: "cus_4",
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      email: "fail@example.com",
      verified: false,
      status: "card_error",
    });

    const result = await persistSetupIntentResult("seti_4", "fail@example.com", deps);
    expect(result.status).toBe("card_error");
  });

  it("resolves email from SetupIntent metadata when body email is omitted", async () => {
    const stripe = makeStripe();
    const deps = { stripe, db: mockDb as never };
    vi.mocked(stripe.setupIntents.retrieve).mockResolvedValue({
      id: "seti_5",
      status: "succeeded",
      customer: "cus_meta",
      payment_method: "pm_meta",
      metadata: { email: "from-meta@example.com" },
      last_setup_error: null,
    } as never);
    vi.mocked(stripe.paymentMethods.retrieve).mockResolvedValue({
      id: "pm_meta",
      customer: "cus_meta",
      card: { brand: "visa", last4: "4242", exp_month: 1, exp_year: 2031 },
    } as never);
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(stripe.subscriptions.create).mockResolvedValue({
      id: "sub_meta",
      status: "active",
    } as never);
    mockDb.validation.upsert.mockResolvedValue({
      id: "v_5",
      stripeSetupIntentId: "seti_5",
      stripePaymentMethodId: "pm_meta",
      stripeCustomerId: "cus_meta",
      stripeSubscriptionId: "sub_meta",
      stripeSubscriptionStatus: "active",
      email: "from-meta@example.com",
      verified: true,
      status: "succeeded",
    });

    await persistSetupIntentResult("seti_5", undefined, deps);

    expect(mockDb.validation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ email: "from-meta@example.com" }),
      }),
    );
  });
});
