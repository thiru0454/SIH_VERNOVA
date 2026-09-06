import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    bhashiniConfigured: Boolean(
      process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY
    ),
    timestamp: new Date().toISOString(),
  });
}
