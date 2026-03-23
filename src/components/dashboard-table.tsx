"use client";

import { useMemo, useState } from "react";
import { filterValidations } from "@/lib/dashboard";
import type { ValidationRecord } from "@/lib/types";
import styles from "./dashboard-table.module.css";

const DASHBOARD_MODE =
  process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_MODE === "test" ? "test" : "live";
const STRIPE_DASHBOARD_BASE =
  DASHBOARD_MODE === "test" ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

const statusClass = (status: string) => {
  if (status === "succeeded") return styles.success;
  if (status === "requires_action") return styles.warning;
  return styles.failure;
};

const classifyFailureReason = (errorCode: string | null, errorMessage: string | null) => {
  if (!errorCode && !errorMessage) return "-";

  const code = (errorCode ?? "").toLowerCase();
  const message = (errorMessage ?? "").toLowerCase();

  if (code.includes("incorrect_cvc") || message.includes("cvc")) {
    return "Declined: CVC is incorrect";
  }
  if (code.includes("expired_card") || message.includes("expired")) {
    return "Declined: card is expired";
  }
  if (code.includes("insufficient_funds")) {
    return "Declined: insufficient funds";
  }
  if (code.includes("do_not_honor") || code.includes("generic_decline")) {
    return "Declined: bank rejected (do not honor)";
  }
  if (code.includes("incorrect_number")) {
    return "Declined: card number invalid";
  }
  if (code.includes("processing_error")) {
    return "Declined: processing error";
  }
  return errorMessage ?? errorCode ?? "Declined";
};

const stripeUrlFor = (id: string | null, type: "customer" | "setup_intent" | "subscription" | "payment_method") => {
  if (!id) return null;
  if (type === "customer") return `${STRIPE_DASHBOARD_BASE}/customers/${id}`;
  if (type === "setup_intent") return `${STRIPE_DASHBOARD_BASE}/setup_intents/${id}`;
  if (type === "subscription") return `${STRIPE_DASHBOARD_BASE}/subscriptions/${id}`;
  return `${STRIPE_DASHBOARD_BASE}/search?query=${encodeURIComponent(id)}`;
};

export const DashboardTable = ({ rows }: { rows: ValidationRecord[] }) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => filterValidations(rows, query, status), [rows, query, status]);

  const copy = async (text: string | null) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search by email or customer ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={styles.select}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="requires_action">Requires action</option>
          <option value="requires_payment_method">Requires payment method</option>
          <option value="card_error">Card error</option>
        </select>
      </header>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Email</th>
              <th>Customer</th>
              <th>SetupIntent</th>
              <th>PaymentMethod</th>
              <th>Subscription</th>
              <th>Verified</th>
              <th>Status</th>
              <th>Auth required</th>
              <th>Card</th>
              <th>Failure reason</th>
              <th>Error</th>
              <th>Stripe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.email}</td>
                <td>
                  <button className={styles.linkButton} onClick={() => copy(row.stripeCustomerId)}>
                    {row.stripeCustomerId}
                  </button>
                </td>
                <td>{row.stripeSetupIntentId}</td>
                <td>
                  <button
                    className={styles.linkButton}
                    onClick={() => copy(row.stripePaymentMethodId)}
                  >
                    {row.stripePaymentMethodId ?? "-"}
                  </button>
                </td>
                <td>
                  <button className={styles.linkButton} onClick={() => copy(row.stripeSubscriptionId)}>
                    {row.stripeSubscriptionId ?? "-"}
                  </button>
                  {row.stripeSubscriptionStatus ? ` (${row.stripeSubscriptionStatus})` : ""}
                </td>
                <td>{row.verified ? "Yes" : "No"}</td>
                <td>
                  <span className={`${styles.badge} ${statusClass(row.status)}`}>{row.status}</span>
                </td>
                <td>{row.requiresAction ? "Yes" : "No"}</td>
                <td>
                  {row.brand ? `${row.brand} •••• ${row.last4}` : "-"}
                  {row.expMonth && row.expYear ? ` (${row.expMonth}/${row.expYear})` : ""}
                </td>
                <td>{classifyFailureReason(row.errorCode, row.errorMessage)}</td>
                <td>{row.errorMessage ?? "-"}</td>
                <td>
                  <div className={styles.linkStack}>
                    <a
                      className={styles.externalLink}
                      href={stripeUrlFor(row.stripeCustomerId, "customer") ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Customer
                    </a>
                    <a
                      className={styles.externalLink}
                      href={stripeUrlFor(row.stripeSetupIntentId, "setup_intent") ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      SetupIntent
                    </a>
                    {row.stripeSubscriptionId && (
                      <a
                        className={styles.externalLink}
                        href={stripeUrlFor(row.stripeSubscriptionId, "subscription") ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Subscription
                      </a>
                    )}
                    {row.stripePaymentMethodId && (
                      <a
                        className={styles.externalLink}
                        href={stripeUrlFor(row.stripePaymentMethodId, "payment_method") ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Payment method
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={14} className={styles.empty}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
