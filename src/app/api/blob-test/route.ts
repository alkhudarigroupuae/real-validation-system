import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const { url } = await put("articles/blob.txt", "Hello World!", {
    access: "public",
    addRandomSuffix: false,
  });

  return NextResponse.json({ url });
}
