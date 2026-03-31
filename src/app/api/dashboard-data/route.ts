import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rows = await prisma.validation.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL." },
      { status: 500 }
    );
  }
}