"use client";

import { useRef, useState } from "react";
import { Mic, Square, Volume2, ArrowLeftRight } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";

type Direction = "hi-to-sat" | "sat-to-hi";
type Status = "idle" | "recording" | "processing" | "done" | "error";

export default function TranslatePage() {
  const [direction, setDirection] = useState<Direction>("hi-to-sat");
  const [status, setStatus] = useState<Status>("idle");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [mocked, setMocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isHiToSat = direction === "hi-to-sat";

  function toggleDirection() {
    if (status === "recording" || status === "processing") return;
    setDirection((d) => (d === "hi-to-sat" ? "sat-to-hi" : "hi-to-sat"));
    setOriginalText("");
    setTranslatedText("");
    setErrorMsg("");
    setStatus("idle");
  }

  async function startRecording() {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      console.error(err);
      setErrorMsg("Microphone access is needed. Please allow it and try again.");
      setStatus("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setStatus("processing");
  }

  async function processAudio(blob: Blob) {
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch("/api/translate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, direction }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Translation failed");
      }

      const data = await res.json();
      setOriginalText(data.originalText);
      setTranslatedText(data.translatedText);
      setMocked(Boolean(data.mocked));

      if (data.translatedAudioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.translatedAudioBase64}`);
        audio.play().catch(() => {});
      }

      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong translating that. Please try again.");
      setStatus("error");
    }
  }

  const sourceLangLabel = isHiToSat ? "Hindi" : "Santhali";
  const targetLangLabel = isHiToSat ? "Santhali" : "Hindi";

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader
        eyebrow="Live pipeline"
        title="Voice Translation"
        subtitle="ASR → Translation → Speech, chained in real time"
      />

      <div className="px-6 flex flex-col gap-6">
        {/* Direction toggle */}
        <button
          onClick={toggleDirection}
          disabled={status === "recording" || status === "processing"}
          className="flex items-center justify-between p-4 rounded-2xl hairline transition-opacity disabled:opacity-50"
          style={{ background: "var(--color-indigo-light)" }}
        >
          <div className="text-left">
            <p className="text-[11px]" style={{ color: "rgba(241,236,224,0.5)" }}>
              {isHiToSat ? "Teacher speaking" : "Student speaking"}
            </p>
            <p className="font-display text-base font-semibold" style={{ color: "var(--color-paper)" }}>
              {sourceLangLabel} → {targetLangLabel}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(227,167,42,0.15)" }}
          >
            <ArrowLeftRight size={16} color="var(--color-mustard)" />
          </div>
        </button>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="relative">
            {status === "recording" && (
              <div className="absolute inset-0 recording-ring" />
            )}
            <button
              onClick={status === "recording" ? stopRecording : startRecording}
              disabled={status === "processing"}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60"
              style={{
                background: status === "recording" ? "var(--color-rust)" : "var(--color-mustard)",
              }}
            >
              {status === "recording" ? (
                <Square size={28} color="var(--color-paper)" fill="var(--color-paper)" />
              ) : (
                <Mic size={30} color="var(--color-indigo)" strokeWidth={2.2} />
              )}
            </button>
          </div>
          <p className="text-[13px] font-medium" style={{ color: "rgba(241,236,224,0.7)" }}>
            {status === "idle" && "Tap to speak"}
            {status === "recording" && "Listening… tap to stop"}
            {status === "processing" && "Translating…"}
            {status === "done" && "Tap to speak again"}
            {status === "error" && "Tap to try again"}
          </p>
        </div>

        {errorMsg && (
          <div
            className="p-4 rounded-xl text-[13px]"
            style={{ background: "rgba(193,85,58,0.15)", color: "#f0a48f", border: "1px solid rgba(193,85,58,0.4)" }}
          >
            {errorMsg}
          </div>
        )}

        {(originalText || translatedText) && (
          <div className="flex flex-col gap-3 pb-4">
            <TranscriptCard label={sourceLangLabel} text={originalText} variant="source" />
            <TranscriptCard
              label={targetLangLabel}
              text={translatedText}
              variant="target"
              showAudioIcon
            />
            {mocked && (
              <p className="text-[11px] text-center" style={{ color: "rgba(241,236,224,0.4)" }}>
                Demo mode — showing sample output. Add Bhashini API credentials in .env.local
                for live translation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptCard({
  label,
  text,
  variant,
  showAudioIcon,
}: {
  label: string;
  text: string;
  variant: "source" | "target";
  showAudioIcon?: boolean;
}) {
  const isTarget = variant === "target";
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: isTarget ? "var(--color-mustard)" : "var(--color-indigo-light)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[11px] font-semibold tracking-wide"
          style={{ color: isTarget ? "rgba(21,34,56,0.6)" : "rgba(241,236,224,0.5)" }}
        >
          {label}
        </p>
        {showAudioIcon && <Volume2 size={14} color="rgba(21,34,56,0.6)" />}
      </div>
      <p
        className="text-[15px] leading-relaxed"
        style={{ color: isTarget ? "var(--color-indigo)" : "var(--color-paper)" }}
      >
        {text}
      </p>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
