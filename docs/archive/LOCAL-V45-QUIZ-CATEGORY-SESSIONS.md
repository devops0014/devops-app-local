# DevOpsCrack v45 — category-driven quiz sessions

## What changed

- MCQ, Interview, Scenario, Rapid Fire, and Hands-on sessions now include **every published question** matching the selected categories and filters.
- Selecting Azure alone uses every eligible Azure question.
- Selecting Azure and Git combines every eligible question from both categories.
- Selecting additional categories keeps adding their eligible questions to the same session.
- Category cards show their current eligible-question count before the session starts.
- The session summary shows the exact combined question total.
- The question-count selector remains only for Adaptive mode, where a target is required.
- The active-session Finish button now uses the real session length instead of stopping visually at question 10.

## Example

| Selected categories | Session total |
|---|---:|
| Azure (14) | 14 |
| Azure (14) + Git (10) | 24 |
| Azure (14) + Git (10) + Linux (25) | 49 |

Counts include only rows that are published, match the selected difficulty/company filters, and have valid MCQ options plus a correct answer for MCQ-based modes.

## Run locally

1. Extract the ZIP into a new folder.
2. Copy your existing `.env.local` into the extracted folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `/quiz`, select MCQ, keep Difficulty as Mixed and Company as Any company, then select categories.

