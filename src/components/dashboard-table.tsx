"use client";

import { useMemo, useState } from "react";
import { filterValidations } from "@/lib/dashboard";
import type { ValidationRecord } from "@/lib/types";
import styles from "./dashboard-table.module.css";

const statusClass = (status: string) => {
  if (status === "succeeded") return styles.success;
  if (status === "requires_action") return styles.warning;
  return styles.failure;
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
              <th>Error</th>
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
                <td>{row.errorMessage ?? "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className={styles.empty}>
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
