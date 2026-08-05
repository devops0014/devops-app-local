import { NextResponse } from "next/server";
import { cacheAIResponse, getCachedAIResponse } from "@/lib/ai/cache";
import { consumeAIAllowance } from "@/lib/ai/usage";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

type EvaluationRequest = {
  technology: string;
  company: string;
  level: string;
  difficulty: string;
  timeSeconds: number;
  answers: Array<{ questionId: string; answer: string }>;
};

type Evaluation = {
  overallScore: number;
  recommendation: "Strong Hire" | "Hire" | "Developing" | "Not Ready";
  competencies: {
    technicalAccuracy: number;
    productionRelevance: number;
    communication: number;
    answerStructure: number;
  };
  strengths: string[];
  improvements: string[];
  questionFeedback: Array<{ questionId: string; score: number; feedback: string; missingKeywords: string[] }>;
  roadmap: string[];
};

export async function POST(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const token = request.headers.get("authorization")!.replace(/^Bearer\s+/i, "");
    const body = await request.json() as EvaluationRequest;
    if (!Array.isArray(body.answers) || body.answers.length < 1 || body.answers.length > 10) {
      return NextResponse.json({ error: "Submit between 1 and 10 interview answers." }, { status: 400 });
    }
    const ids = body.answers.map((item) => item.questionId).filter(Boolean);
    const { data: questions, error } = await supabaseAdmin!.from("general_questions")
      .select("id,question_text,answer_text,expected_keywords,tags,difficulty")
      .in("id", ids)
      .eq("is_published", true)
      .eq("review_status", "approved");
    if (error) throw error;
    if (!questions?.length) return NextResponse.json({ error: "The selected interview questions are unavailable." }, { status: 404 });

    const answerMap = new Map(body.answers.map((item) => [item.questionId, item.answer.trim()]));
    const evaluationInput = {
      technology: body.technology,
      company: body.company,
      level: body.level,
      difficulty: body.difficulty,
      questions: questions.map((question) => ({
        id: question.id,
        question: question.question_text,
        expectedAnswer: question.answer_text,
        expectedKeywords: question.expected_keywords || question.tags || [],
        candidateAnswer: answerMap.get(question.id) || "",
      })),
    };

    let evaluation = await getCachedAIResponse<Evaluation>("mock_feedback", evaluationInput);
    let tokensUsed = 0;
    if (!evaluation) {
      const generated = await requestEvaluation(evaluationInput);
      tokensUsed = generated.tokensUsed;
      const result = generated.result;
      await cacheAIResponse({
        userId: user.id,
        feature: "mock_feedback",
        request: evaluationInput,
        response: result,
        model: process.env.OPENAI_EVALUATION_MODEL || process.env.OPENAI_ADMIN_MODEL || "gpt-4o-mini",
        tokensUsed,
      });
      evaluation = result;
    }

    await consumeAIAllowance(token, "mock_interview", tokensUsed);
    const { data: report, error: insertError } = await supabaseAdmin!.from("mock_interviews").insert({
      user_id: user.id,
      technology: body.technology,
      company: body.company,
      experience_level: body.level,
      difficulty: body.difficulty,
      questions_snapshot: questions.map((item) => ({ id: item.id, question: item.question_text })),
      answers_given: body.answers,
      feedback_ai: evaluation,
      score: evaluation.overallScore,
      time_taken: Math.max(0, Math.floor(body.timeSeconds || 0)),
      status: "completed",
    }).select("id,created_at").single();
    if (insertError) throw insertError;
    return NextResponse.json({ evaluation, report });
  } catch (cause) {
    const status = cause instanceof PaymentApiError ? cause.status : /allowance|limit/i.test(cause instanceof Error ? cause.message : "") ? 429 : 500;
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Unable to evaluate the interview." }, { status });
  }
}

async function requestEvaluation(input: unknown): Promise<{ result: Evaluation; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new PaymentApiError("OPENAI_API_KEY is not configured on the server.", 503);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_EVALUATION_MODEL || process.env.OPENAI_ADMIN_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a strict senior DevOps interviewer. Evaluate only the supplied candidate answers against the expected answers.",
            "Irrelevant, generic, copied-question, extremely short, or empty answers must score 0-20.",
            "Do not reward verbosity. Reward technical correctness, diagnostic sequence, production evidence, remediation, prevention, and communication.",
            "Return strict JSON: overallScore 0-100; recommendation Strong Hire|Hire|Developing|Not Ready;",
            "competencies {technicalAccuracy,productionRelevance,communication,answerStructure} each 0-100;",
            "strengths[]; improvements[]; questionFeedback[{questionId,score,feedback,missingKeywords[]}]; roadmap[].",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    }),
  });
  if (!response.ok) {
    const message = response.status === 401
      ? "OpenAI rejected OPENAI_API_KEY. Add an active project key and restart the application."
      : response.status === 429
        ? "OpenAI usage or billing limit was reached."
        : `OpenAI interview evaluation failed (${response.status}).`;
    throw new PaymentApiError(message, response.status === 401 ? 503 : response.status);
  }
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty interview evaluation.");
  const result = JSON.parse(content) as Evaluation;
  result.overallScore = clamp(result.overallScore);
  for (const key of Object.keys(result.competencies) as Array<keyof Evaluation["competencies"]>) {
    result.competencies[key] = clamp(result.competencies[key]);
  }
  result.questionFeedback = (result.questionFeedback || []).map((item) => ({ ...item, score: clamp(item.score) }));
  return { result, tokensUsed: payload.usage?.total_tokens || 0 };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
