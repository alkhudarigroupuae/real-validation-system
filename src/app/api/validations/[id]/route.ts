import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, internalServerError } from "@/lib/http";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) return badRequest("Missing validation id.");

    const row = await prisma.validation.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Validation not found." }, { status: 404 });

    return NextResponse.json(
      {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    logError("Failed to fetch validation by id", { error });
    return internalServerError();
  }
}
