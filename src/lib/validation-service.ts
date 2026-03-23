import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { normalizeCardError } from "@/lib/status";
import type { ValidationStatus } from "@/lib/types";
import { emailSchema } from "@/lib/validators";

type ServiceDeps = {
  stripe: Stripe;
  db: typeof prisma;
};

const getDefaultDeps = (): ServiceDeps => ({
  stripe: getStripe(),
  db: prisma,
});

const lookupCustomerByEmail = async (deps: ServiceDeps, email: string) => {
  const existing = await deps.stripe.customers.list({
    email,
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0];
  }
  return deps.stripe.customers.create({
    email,
    metadata: {
      source: "card-validation-app",
    },
  });
};

const coercePaymentMethodId = (paymentMethod: string | Stripe.PaymentMethod | null): string | null => {
  if (!paymentMethod) return null;
  if (typeof paymentMethod === "string") return paymentMethod;
  return paymentMethod.id;
};

const buildSafeError = (setupIntent: Stripe.SetupIntent) => ({
  errorCode: setupIntent.last_setup_error?.code ?? null,
  errorMessage: setupIntent.last_setup_error?.message ?? null,
});

const extractCardMetadata = (paymentMethod: Stripe.PaymentMethod | null) => ({
  brand: paymentMethod?.card?.brand ?? null,
  last4: paymentMethod?.card?.last4 ?? null,
  expMonth: paymentMethod?.card?.exp_month ?? null,
  expYear: paymentMethod?.card?.exp_year ?? null,
});

const attachPaymentMethodIfNeeded = async (
  deps: ServiceDeps,
  paymentMethodId: string,
  customerId: string,
) => {
  const current = await deps.stripe.paymentMethods.retrieve(paymentMethodId);
  const attachedCustomer =
    typeof current.customer === "string" ? current.customer : current.customer?.id ?? null;
  if (attachedCustomer === customerId) return;
  await deps.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
};

const ensureSubscriptionForCustomer = async (
  deps: ServiceDeps,
  customerId: string,
  paymentMethodId: string,
  email: string,
  setupIntentId: string,
) => {
  const env = getServerEnv();
  const existing = await deps.stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 20,
  });

  const activeForPrice = existing.data.find((subscription) =>
    subscription.items.data.some((item) => item.price.id === env.STRIPE_PRICE_ID),
  );
  if (activeForPrice) {
    return {
      subscriptionId: activeForPrice.id,
      subscriptionStatus: activeForPrice.status,
    };
  }

  const subscription = await deps.stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: env.STRIPE_PRICE_ID }],
      default_payment_method: paymentMethodId,
      collection_method: "charge_automatically",
      payment_behavior: "error_if_incomplete",
      metadata: {
        email,
        setup_intent_id: setupIntentId,
      },
    },
    {
      idempotencyKey: `subscription-${setupIntentId}`,
    },
  );

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    throw new Error(`Subscription creation did not activate. Status: ${subscription.status}`);
  }

  return {
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  };
};

export const createCustomerAndSetupIntent = async (
  email: string,
  idempotencyKey?: string,
  deps: ServiceDeps = getDefaultDeps(),
) => {
  const customer = await lookupCustomerByEmail(deps, email);
  const setupIntent = await deps.stripe.setupIntents.create(
    {
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      metadata: {
        email,
      },
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );

  return {
    customerId: customer.id,
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret,
  };
};

export const persistSetupIntentResult = async (
  setupIntentId: string,
  emailInput: string | undefined,
  deps: ServiceDeps = getDefaultDeps(),
) => {
  const setupIntent = await deps.stripe.setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });

  const emailFromMetadata = setupIntent.metadata?.email?.trim();
  const rawEmail = (emailInput?.trim() || emailFromMetadata || "").trim();
  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    throw new Error("Invalid or missing email: provide body.email or set SetupIntent.metadata.email.");
  }
  const resolvedEmail = parsedEmail.data;

  const paymentMethod =
    typeof setupIntent.payment_method === "string"
      ? await deps.stripe.paymentMethods.retrieve(setupIntent.payment_method)
      : setupIntent.payment_method;

  const customerId =
    typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id ?? null;
  if (!customerId) {
    throw new Error("SetupIntent is missing customer association.");
  }

  const status = normalizeCardError(setupIntent) as ValidationStatus;
  const paymentMethodId = coercePaymentMethodId(setupIntent.payment_method);
  const requiresAction = setupIntent.status === "requires_action";
  const safeError = buildSafeError(setupIntent);
  const card = extractCardMetadata(paymentMethod && "card" in paymentMethod ? paymentMethod : null);
  const setupSucceeded = status === "succeeded";

  let subscriptionId: string | null = null;
  let subscriptionStatus: string | null = null;
  let verified = false;

  if (setupSucceeded && paymentMethodId) {
    try {
      await attachPaymentMethodIfNeeded(deps, paymentMethodId, customerId);
      const subscription = await ensureSubscriptionForCustomer(
        deps,
        customerId,
        paymentMethodId,
        resolvedEmail,
        setupIntent.id,
      );
      subscriptionId = subscription.subscriptionId;
      subscriptionStatus = subscription.subscriptionStatus;
      verified = true;
      logInfo("Card verification and subscription creation succeeded", {
        setupIntentId: setupIntent.id,
        customerId,
        paymentMethodId,
        subscriptionId,
      });
    } catch (error) {
      logError("Subscription creation failed after setup success", {
        setupIntentId: setupIntent.id,
        customerId,
        paymentMethodId,
        error,
      });
      verified = false;
    }
  }

  try {
    const record = await deps.db.validation.upsert({
      where: {
        stripeSetupIntentId: setupIntent.id,
      },
      update: {
        email: resolvedEmail,
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: subscriptionStatus,
        status,
        verified,
        requiresAction,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        errorCode: safeError.errorCode,
        errorMessage: safeError.errorMessage,
      },
      create: {
        email: resolvedEmail,
        stripeCustomerId: customerId,
        stripeSetupIntentId: setupIntent.id,
        stripePaymentMethodId: paymentMethodId,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: subscriptionStatus,
        status,
        verified,
        requiresAction,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        errorCode: safeError.errorCode,
        errorMessage: safeError.errorMessage,
      },
    });

    return {
      id: record.id,
      email: record.email,
      status,
      verified,
      requiresAction,
      message:
        verified
          ? "Card verified successfully"
          : status === "succeeded"
            ? "Card verified but subscription activation failed. Access is blocked."
          : status === "requires_action"
            ? "Authentication required (3DS / OTP likely)"
            : "Card invalid or not usable",
      stripeSetupIntentId: record.stripeSetupIntentId,
      stripePaymentMethodId: record.stripePaymentMethodId,
      stripeCustomerId: record.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      stripeSubscriptionStatus: record.stripeSubscriptionStatus,
      accessGranted: verified,
      savedToDashboard: true,
    };
  } catch (error) {
    logError("Dashboard persistence failed; continuing with Stripe-only result", {
      setupIntentId,
      error,
    });
    return {
      id: setupIntent.id,
      email: resolvedEmail,
      status,
      verified,
      requiresAction,
      message:
        (verified
          ? "Card verified successfully"
          : status === "succeeded"
            ? "Card verified but subscription activation failed. Access is blocked."
            : status === "requires_action"
              ? "Authentication required (3DS / OTP likely)"
              : "Card invalid or not usable") +
        " (Dashboard database unavailable; result not persisted.)",
      stripeSetupIntentId: setupIntent.id,
      stripePaymentMethodId: paymentMethodId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeSubscriptionStatus: subscriptionStatus,
      accessGranted: verified,
      savedToDashboard: false,
    };
  }
};
