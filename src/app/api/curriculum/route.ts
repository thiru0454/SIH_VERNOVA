import { NextResponse } from "next/server";
import { sampleCurriculum } from "@/data/curriculum";

export async function GET() {
  return NextResponse.json({ lessons: sampleCurriculum });
}
