# Quiz and Practice Modes

The quiz page reads published content through `useContentCatalog`, which uses the
Supabase question repository. It does not generate quiz content with AI.

## Modes

- **MCQ** — requires `options` and a zero-based `correct_option`; scoring is automatic.
- **Interview** — accepts typed or browser speech-to-text answers, reveals the stored
  reference answer, and records a 1–5 self-rating.
- **Scenario** — prioritizes questions tagged as scenarios, incidents, production, or
  troubleshooting. It accepts a detailed response and a self-rating.
- **Rapid Fire** — prioritizes short/easy questions and applies a 20-second timer to
  every question.
- **Hands-on** — prioritizes command, scripting, coding, Dockerfile, YAML, and
  implementation questions. The response editor uses a monospace code style.
- **Adaptive** — uses automatically scorable MCQs, starts at Medium, moves up after a
  correct answer, and moves down after an incorrect answer.

Scenario and Hands-on modes fall back to other published questions in the selected
category when legacy rows have not yet been tagged. MCQ and Adaptive never fall back
to non-MCQ content because their score must remain automatic and deterministic.

## Scoring and persistence

MCQ and Adaptive modes count correct options. Written modes consider a self-rating
of 3–5 mastered and convert all ratings into a readiness percentage. Every completed
session is saved through the existing Zustand learning store and Supabase
`quiz_attempts` repository.

## Voice input

Interview and Scenario modes use the browser Web Speech API when available. If the
browser does not support it or microphone permission is denied, typed answers remain
fully functional.
