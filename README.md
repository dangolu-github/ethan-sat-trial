# Ethan SAT Reading and Writing Workspace

Student-facing GitHub Pages portal for Ethan's SAT Reading and Writing course.

## Routes

- `/` — Joy-style workspace with Class Logbook, Weekly Self-Learning Check, Skill Booster, and Mistake Logbook
- `/course-plan/` — legacy redirect to the home Class Logbook
- `/2026-08-29/` — current Class 01 overview
- `/mock-1/` — assigned Week 1 Reading and Writing mock with 54 questions and deliberate submission
- `/mock-exams/` — legacy redirect to Mock 1
- `/skill-boosters/` — Vocabulary Lab, Reading Lab, and four-domain Intensive Skill Booster
- `/mistake-log/` — server-backed Mistake Logbook with checked mistakes and retry states
- `/2026-08-10/` — Class 00 entry linking the preserved learner handout and homework
- `/hm1-sentence-boundaries/` — assigned HM1 learner practice with draft saving and a deliberate submit button

## Access and privacy

The static learner site requests a short-lived server-issued access token after the course password is entered. The repository and static question assets remain public, so answer keys, teacher notes, source maps, internal question IDs, learner responses, scores, and private records stay outside this repository.

All learner routes use `noindex` metadata. Homework and mock pages preserve local drafts, sync progress to the private Ethan service, and require a visible learner-controlled submit action before creating a submission receipt. Checked answers remain off until released from the authenticated Teacher Portal.
