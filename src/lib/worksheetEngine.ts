import { OutcomeType, OUTCOME_LABELS } from "@/data/curriculum";

export interface WorksheetSection {
  instructionHi: string;
  instructionSat: string;
  items: string[];
}

export interface GeneratedWorksheet {
  title: string;
  outcomeType: OutcomeType;
  outcomeLabel: string;
  sections: WorksheetSection[];
  answerKeyNote: string;
}

/**
 * Fixed, deterministic templates aligned to NIPUN Bharat FLN outcomes.
 * The translated curriculum content is dropped into these templates —
 * the AI (Bhashini NMT) only ever translates language, never invents
 * worksheet structure. This keeps output predictable and curriculum-accurate.
 */
export function buildWorksheet(
  outcomeType: OutcomeType,
  hindiText: string,
  santhaliText: string
): GeneratedWorksheet {
  const outcomeLabel = OUTCOME_LABELS[outcomeType];

  switch (outcomeType) {
    case "letter-recognition":
      return {
        title: "Letter & Word Recognition Worksheet",
        outcomeType,
        outcomeLabel,
        sections: [
          {
            instructionHi: "नीचे दिए गए शब्दों को पढ़ें और अक्षरों को घेरें।",
            instructionSat: santhaliText,
            items: hindiText
              .split(/[।.]/)
              .map((s) => s.trim())
              .filter(Boolean),
          },
        ],
        answerKeyNote:
          "Teacher note: guide students to identify and circle known letters within each word.",
      };
    case "picture-word-match":
      return {
        title: "Picture to Word Matching Worksheet",
        outcomeType,
        outcomeLabel,
        sections: [
          {
            instructionHi: "चित्र को सही शब्द से मिलाएं।",
            instructionSat: santhaliText,
            items: hindiText
              .split(/[।.]/)
              .map((s) => s.trim())
              .filter(Boolean),
          },
        ],
        answerKeyNote:
          "Teacher note: pair each sentence with a matching picture card for the students.",
      };
    case "counting":
      return {
        title: "Counting Practice Worksheet (1–20)",
        outcomeType,
        outcomeLabel,
        sections: [
          {
            instructionHi: hindiText,
            instructionSat: santhaliText,
            items: Array.from({ length: 20 }, (_, i) => String(i + 1)),
          },
        ],
        answerKeyNote:
          "Teacher note: have students point and count aloud in their own language, then Hindi.",
      };
    case "reading-comprehension":
    default:
      return {
        title: "Simple Sentence Reading Worksheet",
        outcomeType,
        outcomeLabel,
        sections: [
          {
            instructionHi: "इस वाक्य को पढ़ें और समझाएं।",
            instructionSat: santhaliText,
            items: [hindiText],
          },
        ],
        answerKeyNote:
          "Teacher note: ask a simple comprehension question in the student's own language.",
      };
  }
}
