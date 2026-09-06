import { NextRequest, NextResponse } from "next/server";
import { bhashiniClient, LangCode } from "@/lib/bhashiniClient";

export interface TranslateVoiceRequest {
  audioBase64: string;
  direction: "hi-to-sat" | "sat-to-hi";
}

export async function POST(req: NextRequest) {
  try {
    const body: TranslateVoiceRequest = await req.json();
    const { audioBase64, direction } = body;

    if (!audioBase64 || !direction) {
      return NextResponse.json(
        { error: "audioBase64 and direction are required" },
        { status: 400 }
      );
    }

    const sourceLang: LangCode = direction === "hi-to-sat" ? "hi" : "sat";
    const targetLang: LangCode = direction === "hi-to-sat" ? "sat" : "hi";

    // Step 1: Speech -> text (source language)
    const asrResult = await bhashiniClient.asr(audioBase64, sourceLang);

    // Step 2: Text -> text (source -> target language)
    const translation = await bhashiniClient.translate(
      asrResult.text,
      sourceLang,
      targetLang
    );

    // Step 3: Text -> speech (target language)
    const tts = await bhashiniClient.tts(translation.text, targetLang);

    return NextResponse.json({
      direction,
      originalText: asrResult.text,
      translatedText: translation.text,
      translatedAudioBase64: tts.audioBase64,
      mocked: asrResult.mocked || translation.mocked || tts.mocked,
    });
  } catch (err) {
    console.error("translate-voice error:", err);
    return NextResponse.json(
      { error: "Translation pipeline failed. Please try again." },
      { status: 500 }
    );
  }
}
