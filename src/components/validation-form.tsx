"use client";

import { FormEvent, useEffect, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { statusToMessage } from "@/lib/status";
import type { ValidationStatus } from "@/lib/types";
import styles from "./validation-form.module.css";

type SetupData = {
  customerId: string;
  setupIntentId: string;
  clientSecret: string | null;
};

type ResultState = {
  status: ValidationStatus;
  message: string;
  verified?: boolean;
  accessGranted?: boolean;
  savedToDashboard?: boolean;
  customerId?: string;
  paymentMethodId?: string | null;
  subscriptionId?: string | null;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const ConfirmCardForm = ({
  email,
  setupData,
  onResult,
}: {
  email: string;
  setupData: SetupData;
  onResult: (next: ResultState) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || !setupData.setupIntentId) return;
    setSubmitting(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement || !setupData.clientSecret) {
      setSubmitting(false);
      onResult({
        status: "unknown",
        message: "Secure card element is not ready. Please try again.",
      });
      return;
    }

    const confirmed = await stripe.confirmCardSetup(setupData.clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          email,
          name: "Customer",
        },
      },
      return_url: `${window.location.origin}${window.location.pathname}`,
    });

    const finalized = await fetch("/api/finalize-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupIntentId: setupData.setupIntentId,
        email,
      }),
    });

    const finalPayload = await finalized.json();

    if (!finalized.ok) {
      onResult({
        status: "unknown",
        message: finalPayload.error ?? "Unable to finalize validation.",
      });
      setSubmitting(false);
      return;
    }

    if (confirmed.error) {
      onResult({
        status: "card_error",
        message: confirmed.error.message ?? statusToMessage("card_error"),
        customerId: setupData.customerId,
        paymentMethodId: finalPayload.stripePaymentMethodId ?? null,
      });
      setSubmitting(false);
      return;
    }

    onResult({
      status: finalPayload.status,
      message: finalPayload.message ?? statusToMessage(finalPayload.status),
      verified: finalPayload.verified,
      accessGranted: finalPayload.accessGranted,
      savedToDashboard: finalPayload.savedToDashboard,
      customerId: finalPayload.stripeCustomerId,
      paymentMethodId: finalPayload.stripePaymentMethodId,
      subscriptionId: finalPayload.stripeSubscriptionId,
    });
    setSubmitting(false);
  };

  return (
    <form className={styles.form} onSubmit={onConfirm}>
      <CardElement
        options={{
          hidePostalCode: true,
          style: {
            base: {
              color: "#111827",
              fontSize: "16px",
              "::placeholder": { color: "#6b7280" },
            },
            invalid: {
              color: "#b91c1c",
            },
          },
        }}
      />
      <button className={styles.button} type="submit" disabled={submitting || !stripe}>
        {submitting ? "Validating..." : "Validate and save card"}
      </button>
    </form>
  );
};

export const ValidationForm = () => {
  const [email, setEmail] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [handlingReturn, setHandlingReturn] = useState(false);

  // After 3DS / redirect, Stripe appends setup_intent & redirect_status to return_url.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnedSetupIntentId = params.get("setup_intent");
    if (!returnedSetupIntentId) return;

    let cancelled = false;

    void (async () => {
      setHandlingReturn(true);
      setApiError(null);

      const response = await fetch("/api/finalize-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupIntentId: returnedSetupIntentId }),
      });
      const payload = await response.json();

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      if (cancelled) return;

      setHandlingReturn(false);

      if (!response.ok) {
        setApiError(payload.error ?? "Unable to finalize after authentication.");
        return;
      }

      setResult({
        status: payload.status,
        message: payload.message ?? statusToMessage(payload.status),
        verified: payload.verified,
        accessGranted: payload.accessGranted,
        savedToDashboard: payload.savedToDashboard,
        customerId: payload.stripeCustomerId,
        paymentMethodId: payload.stripePaymentMethodId,
        subscriptionId: payload.stripeSubscriptionId,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestSetupIntent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);
    setResult(null);
    setLoadingIntent(true);

    const response = await fetch("/api/customer-or-setup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json();
    setLoadingIntent(false);

    if (!response.ok) {
      setApiError(payload.error ?? "Failed to start validation.");
      return;
    }

    setSetupData(payload);
  };

  return (
    <section className={styles.wrapper}>
      <h1 className={styles.title}>Card onboarding validation</h1>
      <p className={styles.subtitle}>
        Your card is being securely verified (no charge at this step).
      </p>

      {handlingReturn && (
        <p className={styles.subtitle} role="status">
          Completing validation after authentication…
        </p>
      )}

      {!setupData && (
        <form className={styles.form} onSubmit={requestSetupIntent}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
            placeholder="customer@example.com"
            required
            autoComplete="email"
          />
          <button className={styles.button} type="submit" disabled={loadingIntent}>
            {loadingIntent ? "Preparing secure form..." : "Continue"}
          </button>
        </form>
      )}

      {setupData?.clientSecret && (
        <Elements stripe={stripePromise}>
          <ConfirmCardForm email={email} setupData={setupData} onResult={setResult} />
        </Elements>
      )}

      {apiError && <p className={styles.error}>{apiError}</p>}

      {result && (
        <article
          className={`${styles.result} ${
            result.status === "succeeded"
              ? styles.success
              : result.status === "requires_action"
                ? styles.warning
                : styles.failure
          }`}
        >
          <strong>{result.message}</strong>
          {result.accessGranted === false && (
            <p>Access is blocked until verification and subscription activation succeed.</p>
          )}
          {result.savedToDashboard === false && (
            <p>Dashboard database is unavailable. Stripe result succeeded but was not stored.</p>
          )}
          {result.customerId && <p>Customer ID: {result.customerId}</p>}
          {result.paymentMethodId && <p>Payment Method ID: {result.paymentMethodId}</p>}
          {result.subscriptionId && <p>Subscription ID: {result.subscriptionId}</p>}
        </article>
      )}
    </section>
  );
};
