import { NextRequest, NextResponse } from "next/server";
import { bhashiniClient } from "@/lib/bhashiniClient";
import { buildWorksheet } from "@/lib/worksheetEngine";
import { OutcomeType } from "@/data/curriculum";

export interface GenerateWorksheetRequest {
  curriculumText: string;
  outcomeType: OutcomeType;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateWorksheetRequest = await req.json();
    const { curriculumText, outcomeType } = body;

    if (!curriculumText || !outcomeType) {
      return NextResponse.json(
        { error: "curriculumText and outcomeType are required" },
        { status: 400 }
      );
    }

    const translation = await bhashiniClient.translate(
      curriculumText,
      "hi",
      "sat"
    );

    const worksheet = buildWorksheet(outcomeType, curriculumText, translation.text);

    return NextResponse.json({ worksheet, mocked: translation.mocked });
  } catch (err) {
    console.error("generate-worksheet error:", err);
    return NextResponse.json(
      { error: "Worksheet generation failed. Please try again." },
      { status: 500 }
    );
  }
}
