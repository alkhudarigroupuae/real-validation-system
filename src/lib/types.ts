export type ValidationStatus =
  | "succeeded"
  | "requires_action"
  | "requires_payment_method"
  | "card_error"
  | "processing"
  | "canceled"
  | "unknown";

export type ValidationRecord = {
  id: string;
  email: string;
  stripeCustomerId: string;
  stripeSetupIntentId: string;
  stripePaymentMethodId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  status: ValidationStatus;
  verified: boolean;
  requiresAction: boolean;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
