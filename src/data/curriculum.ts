export interface CurriculumLesson {
  id: string;
  title: string;
  subject: "Literacy" | "Numeracy";
  gradeLevel: string;
  hindiText: string;
  outcomeType: OutcomeType;
}

export type OutcomeType =
  | "letter-recognition"
  | "picture-word-match"
  | "counting"
  | "reading-comprehension";

export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  "letter-recognition": "Letter / Word Recognition",
  "picture-word-match": "Picture to Word Matching",
  counting: "Counting 1–20",
  "reading-comprehension": "Simple Sentence Reading",
};

export const sampleCurriculum: CurriculumLesson[] = [
  {
    id: "lesson-1",
    title: "Lesson 1: Basic Greetings",
    subject: "Literacy",
    gradeLevel: "Grade 1",
    hindiText: "नमस्ते। आज हम अक्षर सीखेंगे।",
    outcomeType: "letter-recognition",
  },
  {
    id: "lesson-2",
    title: "Lesson 2: Fruits Around Us",
    subject: "Literacy",
    gradeLevel: "Grade 1",
    hindiText: "यह एक सेब है। सेब लाल रंग का होता है।",
    outcomeType: "picture-word-match",
  },
  {
    id: "lesson-3",
    title: "Lesson 3: Let's Count",
    subject: "Numeracy",
    gradeLevel: "Grade 1",
    hindiText: "गिनती करो एक से बीस तक।",
    outcomeType: "counting",
  },
];
