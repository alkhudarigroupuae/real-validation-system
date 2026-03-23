import type Stripe from "stripe";
import type { ValidationStatus } from "@/lib/types";

const STATUS_MESSAGES: Record<ValidationStatus, string> = {
  succeeded: "Card verified successfully",
  requires_action: "Authentication required (3DS / OTP likely)",
  requires_payment_method: "Card invalid or not usable",
  card_error: "Card invalid or not usable",
  processing: "Validation in progress",
  canceled: "Validation canceled",
  unknown: "Validation status unknown",
};

export const statusToMessage = (status: ValidationStatus) =>
  STATUS_MESSAGES[status] ?? STATUS_MESSAGES.unknown;

export const mapSetupIntentStatus = (
  setupIntent: Stripe.SetupIntent,
): ValidationStatus => {
  switch (setupIntent.status) {
    case "succeeded":
      return "succeeded";
    case "requires_action":
      return "requires_action";
    case "requires_payment_method":
      return "requires_payment_method";
    case "processing":
      return "processing";
    case "canceled":
      return "canceled";
    default:
      return "unknown";
  }
};

export const normalizeCardError = (
  setupIntent: Stripe.SetupIntent,
): ValidationStatus => {
  if (setupIntent.last_setup_error?.type === "card_error") {
    return "card_error";
  }
  return mapSetupIntentStatus(setupIntent);
};
