# Ethan SAT Reading and Writing Workspace

Student-facing GitHub Pages portal for Ethan's SAT Reading and Writing course.

## Routes

- `/` — learner workspace with Class Logbook, required homework, suggested practice, Skill Booster, and Mistake Logbook
- `/course-plan/` — separate flexible 20-week course plan; it does not pre-create future class entries
- `/mock-1/` — optional suggested Mock 1 (August 22 Test Set) with 54 Reading and Writing questions and deliberate submission
- `/mock-exams/` — legacy redirect to Mock 1
- `/skill-boosters/` — Vocabulary Lab, Reading Lab, and four-domain Intensive Skill Booster
- `/mistake-log/` — server-backed Mistake Logbook with checked mistakes and retry states
- `/2026-08-29/` — completed Class 01 entry for Central Ideas and Details, Annotated SAT-Style Sentences, and the assigned 30-question class homework
- `/2026-08-29/handout-1-central-ideas-and-details/` — access-controlled, content-free learner shell for the Central Ideas and Details handout
- `/2026-08-29/handout-2-sat-sentence-demonstrations/` — access-controlled, content-free learner shell for the Annotated SAT-Style Sentences handout
- `/2026-08-29/homework-central-ideas-nonfinite/` — assigned 30-question Class 01 homework with draft saving and a deliberate submit button
- `/2026-08-10/` — completed Class 00 entry, linking the preserved learner handout and homework
- `/hm1-sentence-boundaries/` — assigned HM1 learner practice with draft saving and a deliberate submit button

## Access and privacy

The learner enters the course password once in a browser. A successful entry stores an opaque trusted-browser credential—not the password—and silently renews short-lived access on later visits. A new browser or device, private browsing, or cleared site data requires the password again.

The Teacher Portal remains Google owner-only and never asks the teacher for Ethan's password. Its learner-preview links can trust the teacher's current browser without exposing the credential in the finished learner URL.

The repository and static question assets remain public, so answer keys, teacher notes, source maps, internal question IDs, learner responses, scores, and private records stay outside this repository. Class 01 handout routes contain only secure launch shells; the full learner handouts and paired Teacher versions stay in the authenticated service. All learner routes use `noindex` metadata. Homework and mock pages preserve drafts and require a visible learner-controlled submit action. Handout access and learner-safe answer annotations are separate Teacher Portal controls.
