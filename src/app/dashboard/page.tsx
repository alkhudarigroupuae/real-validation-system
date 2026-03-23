import { prisma } from "@/lib/db";
import { DashboardTable } from "@/components/dashboard-table";
import type { ValidationRecord } from "@/lib/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  const rows = await prisma.validation.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Validation dashboard</h1>
      <p className={styles.subtitle}>
        Internal operational view. No raw card numbers or CVC are stored.
      </p>
      <DashboardTable rows={rows.map(mapRecord)} />
    </main>
  );
}
