import type { ValidationRecord } from "@/lib/types";

export const filterValidations = (
  rows: ValidationRecord[],
  query: string,
  status: string,
) => {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.email.toLowerCase().includes(normalizedQuery) ||
      row.stripeCustomerId.toLowerCase().includes(normalizedQuery);
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });
};
