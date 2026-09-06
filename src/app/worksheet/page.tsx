"use client";

import { useState } from "react";
import { NotebookPen, Sparkles, ChevronDown } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";
import { sampleCurriculum, OUTCOME_LABELS, OutcomeType } from "@/data/curriculum";
import type { GeneratedWorksheet } from "@/lib/worksheetEngine";

type Status = "idle" | "loading" | "done" | "error";

export default function WorksheetPage() {
  const [selectedLessonId, setSelectedLessonId] = useState(sampleCurriculum[0].id);
  const [customText, setCustomText] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [outcomeType, setOutcomeType] = useState<OutcomeType>(
    sampleCurriculum[0].outcomeType
  );
  const [status, setStatus] = useState<Status>("idle");
  const [worksheet, setWorksheet] = useState<GeneratedWorksheet | null>(null);
  const [mocked, setMocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedLesson = sampleCurriculum.find((l) => l.id === selectedLessonId)!;
  const curriculumText = useCustom ? customText : selectedLesson.hindiText;

  function handleLessonChange(id: string) {
    setSelectedLessonId(id);
    const lesson = sampleCurriculum.find((l) => l.id === id)!;
    setOutcomeType(lesson.outcomeType);
    setWorksheet(null);
  }

  async function generateWorksheet() {
    if (!curriculumText.trim()) {
      setErrorMsg("Please enter or select some curriculum text first.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/generate-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculumText, outcomeType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Worksheet generation failed");
      }
      const data = await res.json();
      setWorksheet(data.worksheet);
      setMocked(Boolean(data.mocked));
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't generate the worksheet. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader
        eyebrow="Rule-based, not free-generated"
        title="Worksheet Generator"
        subtitle="Fixed templates mapped to NIPUN Bharat FLN outcomes"
      />

      <div className="px-6 flex flex-col gap-5">
        {/* Source toggle */}
        <div className="flex gap-2">
          <TabButton active={!useCustom} onClick={() => setUseCustom(false)}>
            Sample Lesson
          </TabButton>
          <TabButton active={useCustom} onClick={() => setUseCustom(true)}>
            Paste My Own
          </TabButton>
        </div>

        {!useCustom ? (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium" style={{ color: "rgba(241,236,224,0.5)" }}>
              Choose a lesson
            </label>
            <div className="relative">
              <select
                value={selectedLessonId}
                onChange={(e) => handleLessonChange(e.target.value)}
                className="w-full appearance-none p-4 rounded-2xl hairline text-[14px] font-medium pr-10"
                style={{ background: "var(--color-indigo-light)", color: "var(--color-paper)" }}
              >
                {sampleCurriculum.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                color="rgba(241,236,224,0.5)"
              />
            </div>
            <div
              className="p-4 rounded-2xl text-[14px]"
              style={{ background: "rgba(241,236,224,0.06)", color: "rgba(241,236,224,0.75)" }}
            >
              {selectedLesson.hindiText}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium" style={{ color: "rgba(241,236,224,0.5)" }}>
              Hindi curriculum text
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="टाइप करें या पेस्ट करें…"
              rows={4}
              className="w-full p-4 rounded-2xl hairline text-[14px] resize-none"
              style={{ background: "var(--color-indigo-light)", color: "var(--color-paper)" }}
            />
          </div>
        )}

        {/* Outcome type */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium" style={{ color: "rgba(241,236,224,0.5)" }}>
            Learning outcome
          </label>
          <div className="relative">
            <select
              value={outcomeType}
              onChange={(e) => setOutcomeType(e.target.value as OutcomeType)}
              className="w-full appearance-none p-4 rounded-2xl hairline text-[14px] font-medium pr-10"
              style={{ background: "var(--color-indigo-light)", color: "var(--color-paper)" }}
            >
              {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              color="rgba(241,236,224,0.5)"
            />
          </div>
        </div>

        <button
          onClick={generateWorksheet}
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl font-display font-semibold text-[15px] transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: "var(--color-mustard)", color: "var(--color-indigo)" }}
        >
          <Sparkles size={17} />
          {status === "loading" ? "Generating…" : "Generate Worksheet"}
        </button>

        {errorMsg && (
          <div
            className="p-4 rounded-xl text-[13px]"
            style={{ background: "rgba(193,85,58,0.15)", color: "#f0a48f", border: "1px solid rgba(193,85,58,0.4)" }}
          >
            {errorMsg}
          </div>
        )}

        {worksheet && (
          <div className="flex flex-col gap-4 pb-6">
            <div
              className="p-5 rounded-2xl"
              style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <NotebookPen size={16} color="var(--color-rust)" />
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-rust)" }}>
                  {worksheet.outcomeLabel}
                </p>
              </div>
              <h2 className="font-display text-xl font-semibold mb-4">{worksheet.title}</h2>

              {worksheet.sections.map((section, i) => (
                <div key={i} className="flex flex-col gap-3 mb-4">
                  <div className="hairline-dark rounded-xl p-3" style={{ background: "var(--color-paper-dim)" }}>
                    <p className="text-[13px] font-medium mb-0.5">{section.instructionHi}</p>
                    <p className="text-[13px]" style={{ color: "var(--color-rust)" }}>
                      {section.instructionSat}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item, j) => (
                      <span
                        key={j}
                        className="px-3 py-1.5 rounded-lg text-[13px] hairline-dark"
                        style={{ background: "#fff" }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-[12px] italic pt-2" style={{ color: "rgba(26,26,26,0.55)" }}>
                {worksheet.answerKeyNote}
              </p>
            </div>

            {mocked && (
              <p className="text-[11px] text-center" style={{ color: "rgba(241,236,224,0.4)" }}>
                Demo mode — Santhali text is a placeholder. Add Bhashini API credentials in
                .env.local for live translation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
      style={{
        background: active ? "var(--color-mustard)" : "var(--color-indigo-light)",
        color: active ? "var(--color-indigo)" : "rgba(241,236,224,0.6)",
      }}
    >
      {children}
    </button>
  );
}
