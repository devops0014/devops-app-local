# DevOpsCrack question banks

Run `supabase/migrations/2026073102_split_question_banks_and_presence.sql` once in the Supabase SQL Editor before starting this release.

## MCQ bank

`mcq_questions` is used only by MCQ, Rapid Fire and Adaptive quiz modes. Every row requires at least two options and a 1-based `correct_option` in uploaded files.

## General bank

`general_questions` is used by Practice, Flashcards and Mock Interviews. Quiz mode mapping is:

- Interview: `question_type=general`
- Scenario: `question_type=scenario`
- Hands-on: `question_type=troubleshooting`
- Behavioral questions remain available in Practice, Flashcards and Mock Interviews.

Bulk Import asks which bank is being uploaded, validates the matching format, previews invalid rows and can skip duplicates while importing every other valid row.
