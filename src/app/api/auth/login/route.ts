import { NextRequest, NextResponse } from "next/server";

const CORRECT_PASSWORD = "Belal100%";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== CORRECT_PASSWORD) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    
    response.cookies.set("dashboard-auth", CORRECT_PASSWORD, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 3600 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}