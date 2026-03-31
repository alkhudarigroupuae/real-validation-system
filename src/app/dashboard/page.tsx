"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardTable } from "@/components/dashboard-table";
import type { ValidationRecord } from "@/lib/types";
import styles from "./page.module.css";

const AUTH_KEY = "dashboard-auth";
const PASSWORD = "Belal100%";

const mapRecord = (row: {
  id: string;
  email: string;
  stripeCustomerId: string;
  stripeSetupIntentId: string;
  stripePaymentMethodId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  status: string;
  verified: boolean;
  requiresAction: boolean;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ValidationRecord => ({
  ...row,
  status: row.status as ValidationRecord["status"],
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ValidationRecord[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth !== PASSWORD) {
      router.push("/login");
      return;
    }

    // Fetch data
    fetch("/api/dashboard-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setDbError(data.error);
        } else {
          setRows(data.rows.map(mapRecord));
        }
      })
      .catch(() => {
        setDbError("Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Validation dashboard</h1>
      <p className={styles.subtitle}>
        Internal operational view. No raw card numbers or CVC are stored.
      </p>
      {dbError && (
        <p className={styles.subtitle} style={{ color: "var(--error-text)" }}>
          {dbError}
        </p>
      )}
      <DashboardTable rows={rows} />
    </main>
  );
}
