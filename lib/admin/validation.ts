import { sourceHash } from "@/lib/admin/server";

export type ImportRow = Record<string, unknown>;
export type QuestionBank = "mcq" | "general";
export type ValidQuestionRow = {
  rowNumber: number;
  category_id: string;
  question_text: string;
  answer_text: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  company_asked: string[];
  question_type: string;
  topic: string | null;
  subtopic: string | null;
  experience: string | null;
  interview_round: string | null;
  source_hash: string;
  options: string[] | null;
  correct_option: number | null;
  explanation: string | null;
};

const GENERAL_TYPES = new Set(["general", "scenario", "troubleshooting", "behavioral"]);

function text(value: unknown) { return String(value ?? "").trim(); }
function list(value: unknown) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean);
}

export function validateRows(rows: ImportRow[], categories: Map<string, string>, bank: QuestionBank) {
  const valid: ValidQuestionRow[] = [];
  const invalid: Array<{ rowNumber: number; errors: string[]; row: ImportRow }> = [];
  const seen = new Set<string>();
  const duplicatesInFile: Array<{ rowNumber: number; question: string }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const categoryValue = text(row.category_id || row.category || row.category_slug).toLowerCase();
    const categoryId = categories.get(categoryValue) || (Array.from(categories.values()).includes(categoryValue) ? categoryValue : "");
    const question = text(row.question_text || row.question);
    const answer = text(row.answer_text || row.expected_answer || row.answer);
    const rawDifficulty = text(row.difficulty || "Medium").toLowerCase();
    const difficulty = `${rawDifficulty.charAt(0).toUpperCase()}${rawDifficulty.slice(1)}` as ValidQuestionRow["difficulty"];
    const rawType = text(row.question_type || row.type || "general").toLowerCase();
    const questionType = rawType === "hands-on" || rawType === "troubleshoot" ? "troubleshooting" : rawType;
    const options = [
      row.option_1 ?? row["option-1"], row.option_2 ?? row["option-2"],
      row.option_3 ?? row["option-3"], row.option_4 ?? row["option-4"],
    ].map(text).filter(Boolean);
    const rawCorrect = text(row.correct_option ?? row["correct option"]);
    const correctOption = rawCorrect ? Math.max(0, Number(rawCorrect) - 1) : null;
    const errors: string[] = [];
    if (!categoryId) errors.push(`Unknown category "${categoryValue || "missing"}"`);
    if (question.length < 10) errors.push("Question must contain at least 10 characters");
    if (answer.length < 10) errors.push("Answer must contain at least 10 characters");
    if (!["Easy","Medium","Hard"].includes(difficulty)) errors.push("Difficulty must be Easy, Medium, or Hard");
    if (bank === "general" && !GENERAL_TYPES.has(questionType)) errors.push(`Question type must be general, scenario, troubleshooting, or behavioral`);
    if (bank === "mcq" && options.length < 2) errors.push("MCQ requires at least two options");
    if (bank === "mcq" && (correctOption === null || !Number.isInteger(correctOption) || correctOption >= options.length)) errors.push("MCQ correct option must be a valid 1-based option number");
    if (errors.length) {
      invalid.push({ rowNumber, errors, row });
      return;
    }
    const hash = sourceHash(question, categoryId);
    if (seen.has(hash)) {
      duplicatesInFile.push({ rowNumber, question });
      return;
    }
    seen.add(hash);
    valid.push({
      rowNumber,
      category_id: categoryId,
      question_text: question,
      answer_text: answer,
      difficulty,
      tags: list(row.tags),
      company_asked: list(row.company_asked || row.companies),
      question_type: bank === "mcq" ? "mcq" : questionType,
      topic: text(row.topic) || null,
      subtopic: text(row.subtopic) || null,
      experience: text(row.experience) || null,
      interview_round: text(row.interview_round || row.round) || null,
      source_hash: hash,
      options: bank === "mcq" ? options : null,
      correct_option: bank === "mcq" ? correctOption : null,
      explanation: text(row.explanation) || null,
    });
  });
  return { valid, invalid, duplicatesInFile };
}
