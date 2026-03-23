import { NextResponse } from "next/server";

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const tooManyRequests = (retryAfterMs: number) =>
  NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );

export const internalServerError = () =>
  NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
