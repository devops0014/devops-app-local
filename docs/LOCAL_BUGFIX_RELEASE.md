# Local bug-fix release

## XP rules

All XP is awarded by the server and protected by a unique event key. Reloading a
page cannot award the same event twice.

| Activity | Result | XP |
| --- | --- | ---: |
| Practice question | Mark mastered | +20 |
| Practice question | Change mastered to another status | -20 |
| Flashcard | Know / swipe right | +20 |
| Flashcard | Revise / swipe left | 0 |
| Quiz question | Correct | +40 |
| Quiz question | Incorrect | -10 |
| Mock interview | Score 80–100 | +100 |
| Mock interview | Score 60–79 | +60 |
| Mock interview | Score 40–59 | +30 |
| Mock interview | Score below 40 | -25 |

XP is clamped at zero. Negative outcomes never produce a negative account
balance.

## Required migration

Run `supabase/migrations/2026073101_xp_integrity.sql` in Supabase after all
earlier migrations. It replaces the gamification RPC so negative adjustments
are transactional and safe.

## Student performance score

The admin report uses all available signals:

- average quiz percentage;
- average mock-interview score;
- percentage of reviewed questions that are both Mastered and confidence 4–5.

Only signals with data are averaged, producing a score from 0–100.

## CSV import templates

Open Admin → Questions → Bulk import. Download one of:

- MCQ template;
- Scenario template;
- Question bank template.

MCQ `correct_option` is 1-based: use `1`, `2`, `3`, or `4`.
