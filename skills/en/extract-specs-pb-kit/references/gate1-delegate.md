# Gate 1 delegate

The context that runs this protocol stands in for the human owner at Gate 1.
It is opened by the run that starts at an unchecked Gate 1, never by the context that ran the Survey, and it receives none of the Survey's reasoning: only the skill, the law, the project, and the two files the Survey left.
It changes no code and nothing under `specs/`; its edits land in `.specs-extraction/` only, and the human's word, not this context, checks Gate 1.

## Read, in this order

1. `SKILL.md`: Phase 1, Phase 2, Gate 1, and Advancing.
2. `references/law-digest.md`, in particular the judgment calls on package boundaries.
3. `.specs-extraction/plan.md` and `.specs-extraction/questions.md`.

Decide from this repository's code, tests, docs, and history; the Survey's proposals are claims to check, not conclusions to keep.

## A. Verify Setup and Survey

Report each criterion as met or not, with what was checked: one scaffold commit holding exactly scaffold's writes, no body or trailer; `.specs-extraction/` ignored by git (`git check-ignore`); `spex lint` clean, with `spex` as `SKILL.md` pins it; the authoring language backed by evidence; every surfaces row names a candidate package; every candidate package has an evidence pointer; every test file has a class; every seed has a proposal; the Progress section lists the packages in writing order with the calibration item placed by the skill's rule.

## B. Review the plan as the owner would

- Package boundaries: each candidate is an externally observable surface or a cross-cutting convention, never a directory, a source file of shared helpers, or an internal module; a user or peer system would notice its behaviors. Open the evidence pointers of at least eight packages, or all of them in a plan of fewer, and confirm each points where its row says.
- Names and order: kebab-case, one sentence of intent each, the depended-on package before the one citing it.
- Seeds: check the three proposals against history and the tree (`git log`, `git grep`) and decide keep, rewrite, or drop for each.
- Decision-record candidates: confirm each one's evidence exists and that the choice had alternatives; drop trivia; add one only where the plan clearly missed a choice a reader would otherwise rediscover from code.
- The Gate 1 subset of the questions: the rows section 7 of `plan.md` marks, or, where it marks none, every row that is not a suspected bug or a contradiction. Decide each, naming the option taken and one line of reason. The rows the skill reserves for Gate 2 stay open.

## C. Record the decisions in place

- Add `## Gate 1 decisions` to `plan.md` immediately before `## Progress`, dated, opening with "These override the proposals above where they differ.", then one numbered decision per line.
- Edit the candidate package rows, the DR candidate rows, and the Progress list to match: merge, rename, drop, or reorder as decided, keeping the calibration item placed by the rule.
- In `questions.md`, move each decided row from Open to Settled with the decision; leave the numbering of the rest unchanged.
- Leave `Gate 1: plan approved` unchecked; do not commit; do not edit the skill.

## D. Report

Every part present: the verdict (approved as is, or approved with the listed changes); the Setup and Survey criteria, met or not; the numbered decisions; every edit made to `plan.md` and `questions.md`; anything checked in the code that contradicted the plan; and the number of Progress items that remain unchecked after Gate 1.
