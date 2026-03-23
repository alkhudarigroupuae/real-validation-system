import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { internalServerError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await prisma.validation.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      { status: 200 },
    );
  } catch (error) {
    logError("Failed to fetch validations", { error });
    return internalServerError();
  }
}
