"use client";

import { useEffect, useMemo, useState } from "react";
import { listPublishedGeneralQuestions, listPublishedMcqQuestions } from "@/lib/repositories/content-repository";
import type { Question } from "@/lib/types";

export type ContentCategory = {
  name: string;
  slug: string;
  total: number;
};

export function useContentCatalog() {
  const [generalQuestions, setGeneralQuestions] = useState<Question[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([listPublishedGeneralQuestions(), listPublishedMcqQuestions()])
      .then(([general, mcq]) => { setGeneralQuestions(general); setMcqQuestions(mcq); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load the question bank."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const totals = new Map<string, ContentCategory>();
    for (const question of [...generalQuestions, ...mcqQuestions]) {
      const current = totals.get(question.categorySlug);
      if (current) current.total += 1;
      else totals.set(question.categorySlug, { name: question.category, slug: question.categorySlug, total: 1 });
    }
    return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [generalQuestions, mcqQuestions]);

  return {
    questions: generalQuestions,
    generalQuestions,
    mcqQuestions,
    allQuestions: [...generalQuestions, ...mcqQuestions],
    categories,
    loading,
    error,
  };
}
