---
name: extract-specs-pb-kit
description: Rule files of the extract-specs playbook, which copies this folder into each extraction it runs. Not a skill to invoke directly; to extract specs from a project, start the extract-specs playbook.
---

# Spec extraction

Write a `specs/` tree for a project that already carries a large body of code and no specs, so the project can iterate spec-first from now on.
The tree obeys the spec law that `spex scaffold` installs as the project's own `specs/meta.md`, and it describes the project as it is today.

## Hard rules

- **As-is.** The project's implementation and tests stay untouched. Outside `specs/`, the only writes are scaffold's own (`LICENSE` when none exists, agent instruction files) and the ledger directory. Caches that running the project's tests or probes leave behind, which `git status` does not show, fall outside this rule.
- **Evidence or nothing.** Every spec item descends from a ledger line that names `file:line` or a test. The ledger lives in `.specs-extraction/` at the project root, ignores itself through its own `.gitignore`, and is never committed.
- **Thin Verification is a known deviation.** Verification maps existing integration and system tests only. Each behavior without one is recorded as a gap, and the gaps become intent records at hand-over.
- **Renumber freely.** Nothing in this tree has a public release, so item IDs compact and reorder until the tree settles (meta-12).
- **The tree's language, never this skill's.** Every spec word is written in the language that `specs/meta.md` declares (meta-27), whatever language these instructions use.

`spex` below stands for `npx -y @sublang/spex@4.1.0`.
The pin keeps every run on one CLI version; it moves only by editing this line.

## Phases

| # | Phase | Produces | Ends at |
| --- | --- | --- | --- |
| 1 | Setup | scaffolded `specs/`, law read, ledger dir, first commit | Setup section of `plan.md` filled |
| 2 | Survey | `plan.md`: surfaces, truth sources, tests, seeds, candidate packages and DRs | **Gate 1**: a human reviews `plan.md` |
| 3 | Decisions | accepted DRs for choices already made | DRs committed |
| 4 | Packages | one package per context: ledger, items, Verification, review, commit | every package in `plan.md` checked |
| 5 | Hand-over | parked citations resolved, duplicates removed, IDs compacted, gap IRs, `map.md`, `questions.md` | **Gate 2**: a human reviews the tree |

Phases 1, 2, and 5 are detailed below; phases 3 and 4 are the loop the run advances through, one fresh context per item, as [Advancing](#advancing) states.

## Phase 1: Setup

1. **Confirm a clean start.** `git status` shows a clean worktree; a dirty tree ends the run with a message naming the dirty paths. Create and switch to a branch named `specs`, or the name the caller gives, or continue it when it exists.
2. **Determine the authoring language.** Evidence is the language contributors write in: README, CONTRIBUTING, docs, code comments, commit subjects. Product strings shown to end users are not evidence. Pick the dominant language and record each piece of evidence in `plan.md`; a language the caller names for the specs wins over the evidence, which is still recorded, with the mismatch logged in `questions.md` as settled by the caller. A language outside what scaffold bundles (`en`, `zh` today) takes the nearer bundled code for the framework files, keeps the project's own language for project-authored content, and logs the mismatch in `questions.md`.
3. **Scaffold.** Run `spex scaffold --lang <code> --agents <names>` at the project root, with `<names>` the agents this project is worked with (default: the one running now). Record every path and warning scaffold prints, in particular a created `LICENSE` and the agent instruction file it wrote or appended.
4. **Read the law in full.** `specs/meta.md`, then `specs/decisions/000-spec-structure-format.md`, then [`references/law-digest.md`](references/law-digest.md), which ranks what bites during extraction and settles the judgment calls the law leaves open.
5. **Open the ledger directory.** Create `.specs-extraction/` with a `.gitignore` inside it that holds the single line `*`, so git ignores the directory and that file alike without a change outside it, copy [`templates/plan.md`](templates/plan.md) and [`templates/questions.md`](templates/questions.md) into it, and fill the Setup section of `plan.md`, recording in the caller's own words every instruction the caller gave the run beyond starting it, such as the language to be addressed and to write process files in, files not to read, or the branch to use.
6. **Commit the scaffold.** `spex lint` is clean; one commit holds exactly scaffold's writes, with the message `Scaffold specs with spex` and nothing else: no body, no trailer, whatever the environment suggests.

Setup is done when the branch exists, the commit is in, the law has been read in full, and the Setup section of `plan.md` names the language with its evidence, lists scaffold's writes, and records the caller's instructions or says there were none.

## Phase 2: Survey

The survey reads the project and writes only `plan.md` and `questions.md`.
Fill the tables of `plan.md` in this order, each table complete before the next starts:

1. **Sources of truth.** README, docs, ADRs or design notes, CHANGELOG, CI configuration, lint and formatter configuration, commit and release conventions, issue and PR templates. For each: path, what it claims, and whether the claim is observed in the code and history, merely stated, or stale.
2. **External surfaces.** Everything a user or a peer system can reach: entry points, CLI subcommands and flags, routes and endpoints, UI pages, scheduled jobs, configuration keys and environment variables, persisted formats and schemas, external systems called. For each: where it is defined and one piece of evidence. Every row names the candidate package that will own it.
3. **Tests.** Every test file or suite, classified as unit, integration, or system. Integration crosses module boundaries or touches real IO or a process boundary; system drives the product through its outer interface or an end-to-end framework; everything else is unit. Each row names the surfaces the test exercises.
4. **Seeds.** Scaffold installs `packages/git.md`, `packages/licensing.md`, and `intents/000-spdx-headers.md` as claims about this project. Compare each with observed practice, item by item and with counts wherever history or the tree gives them (commit subjects of each form, bodies, trailers, subject and line lengths, files carrying a header), and propose keep, rewrite to match practice, or drop. The seed IR states a wish, so it is the human's call at Gate 1.
5. **Candidate packages.** One package per externally observable surface or per cross-cutting convention, never per directory or per source file: a file of shared helpers is not a package, and each helper's behavior goes to the package whose surface exposes it, or is no item. The count follows the surfaces and conventions found, not the size of the code; a typical project yields 5 to 20, and a count outside that range, or a package that would hold one or two items, is a prompt to check the cuts, never a reason to merge or split by itself. Each row: kebab-case name, a one-sentence Intent, its users, the subjects it closes over, evidence pointers, a size estimate, and the packages it depends on. Order them for writing: conventions first, because they are cheap; then core surfaces along the dependency direction, with the depended-on package written before the one citing it. Mark the calibration point: the first package in writing order that a row of the tests table classed integration or system names among its surfaces exercised, or, where no such row names any package, the first package in writing order that is not a convention; it enters the Progress section as its own item right after that package, and the run stops there until the human has read the package. A CLI subcommand belongs to the package whose behavior it exposes when it is a thin adapter, and to a CLI package of its own when it carries option semantics and output formats of its own; see the judgment calls in [`references/law-digest.md`](references/law-digest.md).
6. **Candidate DRs.** Architectural choices already made that a reader would otherwise rediscover from code: frameworks and storage chosen, protocols, process models, compatibility promises. Each row: the decision, the evidence, and the rationale where history records one, else `unrecorded`.
7. **Questions.** Anything the survey found that only a human can settle: contradictions between sources, dead surfaces, naming or boundary calls that could go either way. Each question carries the option this run recommends and why. A suspected bug is logged in `questions.md` with its evidence and specified as the code behaves today; it asks the human for nothing before Gate 2.

The survey is done when every row of the surfaces table names a candidate package, every candidate package carries at least one evidence pointer, every test file has a class, every seed has a proposal, and the Progress section of `plan.md` lists the packages in writing order as unchecked items.

**Gate 1.** End the run here, the context that ran the Survey included: the next run starts in a fresh context, whatever the host offers, so that nothing the Survey read or proposed reaches the loop except through `plan.md`.
The final message names the path of `plan.md`, lists the open questions, and asks the human to review package boundaries, names, order, and the seed proposals.
It also states how many Progress items follow and that each one is a fresh context, so the human knows the size of what the next run starts.
It ends by naming the next step and nothing else: start a new session in the project and invoke this skill again; with Gate 1 unchecked, that run opens the Gate 1 delegate, and with Gate 1 checked by the human after their own review of `plan.md`, it goes on to the decision records. The caller's instructions travel in `plan.md`, so the new invocation need not repeat them.
It never offers to open the delegate or continue in this context.
The review may be delegated: the run that starts at an unchecked Gate 1 opens a fresh context on [`references/gate1-delegate.md`](references/gate1-delegate.md), which checks the Survey's criteria, reviews the plan as the owner would, and records its decisions in `plan.md` and `questions.md`; that run ends with the delegate's report, and the human's word, after any edits of their own, checks Gate 1.
The human's edits to `plan.md`, or the delegate's that the human let stand, are the approved plan; a later run reads them, never the Survey's memory.

## Phase 3: Decisions

- One DR per approved candidate, status Accepted, sections per meta-4.
- Context comes from history, docs, and code as found; a rationale no source records is written as `Rationale unrecorded`, never reconstructed.
- One commit for the set; `map.md` gains a row per DR.

## Phase 4: Packages

Each package runs in a fresh context and ends in one commit; `plan.md` is the hand-off between runs.
The boundaries the human approved at Gate 1 stand; a run whose evidence puts a subject in another package writes what the evidence shows, edits the candidate rows of `plan.md` to match, and logs the move in `questions.md` for the human.

1. Read the code, tests, and docs of the package's subjects.
2. Build `.specs-extraction/ledger/<pack>.md` from [`templates/ledger.md`](templates/ledger.md): one line per candidate behavior with its evidence. A behavior without a ledger line is not an item. A seed package is rewritten item by item: each seed item gets its own ledger line, kept, rewritten, or dropped with the evidence or the Gate 1 decision for it, so nothing a seed states leaves the tree unseen.
3. Classify each line External, Internal, or skip, using the questions in [`references/law-digest.md`](references/law-digest.md).
4. Write the package: one GEARS statement per item, cases after the colon, peer citations only to packages already written and only to their External Behavior, running from the relying behavior to the relied-on one while a trigger names its caller in prose; a citation to an unwritten package is parked in the ledger line. A contradiction or an omission found in an already written package, with its evidence in hand, is corrected there in the same commit and noted in both packages' ledgers under Review; one the run cannot settle from its evidence is a note in the ledger line for hand-over item 1.
5. Verification maps existing integration and system tests only; each uncovered behavior is a gap line in the ledger.
6. Self-check against [`references/rubric.md`](references/rubric.md); `spex lint` is clean.
7. A fresh-context reviewer receives what the reviewer protocol in `rubric.md` names and nothing more, and writes its report to `.specs-extraction/reviews/<pack>.md`, the one file it writes: items without evidence, observable behaviors the package misses, and the failed checks. The reviewer's context is opened by whatever opened the author's: an orchestrating context opens it once the author reports steps 1 to 6 done, passing it the package name and none of the author's notes, and hands the author the report's path, resuming the author, or reopening it with the package, its ledger, and that path where the host cannot resume a context; an author the human opened delegates it. The step is done when the report file exists and the ledger's Review section lists its findings as the file states them, each with a disposition; a report is a file the reviewer wrote, so the author's own re-read of the package stands as a self-check, never as a review.
8. Commit, with a message in the form the project's own `packages/git.md` states once the seed has been reconciled: subject and body only, and a trailer solely when `git.md` requires one, whatever the environment suggests. Check the package off in `plan.md`.

## Phase 5: Hand-over

The hand-over turns the separately written packages into one tree and turns the gaps into work items.
The first hand-over context replaces the single `Hand-over` line of the Progress section with the five items below, then takes the first; each later context takes the next, so every item is one fresh context and one commit.

1. **Citations and duplicates.** Walk the `Parked citations` table of every ledger: add each unresolved citation at the phrase in the citing package, pointing at the peer's External Behavior, and mark the row resolved; confirm each reverse row was honored by the later package, and that no citation runs from a callee to its caller. Then walk the ledger notes that say another package owns a behavior, and where both packages still state it, the owner keeps it and the other cites. Apply the `Hand-over fix list` of `plan.md`. Done when no parked row is open, no requirement is stated twice, and the list is worked through.
2. **Renumbering.** In each package file whose item numbers have gaps or run out of document order, renumber the items 1 to N in document order (meta-12: nothing is released), retarget every mention of those IDs across the tree, `map.md`, the ledgers' gap and parked tables, and `questions.md`, and record the old-to-new map in the ledger; the reports under `.specs-extraction/reviews/` keep the IDs they were written with. Done when `spex lint` is clean, every file numbers its items in order, and no ledger or question row names an ID that no longer exists.
3. **Gap intents.** For each package whose ledger has a `Verification gaps` table with rows, write one intent record `intents/<NNN>-<pack>-integration-tests.md` titled `Add integration tests for <pack>`, status Pending, with the sections meta-5 requires: Intent naming the package and the behaviors uncovered; Deliverables as one checkbox per gap row; Tasks numbered, each sized to one commit, each naming the test kind the gap row asks for; Verification naming the test items the package will gain. The record cites behavior items; no spec cites the record (meta-18). Done when every package with gaps has its record and no two records overlap.
4. **Records and map.** Where a DR's Context names a function or module that a package item now specifies, cite the item in its place (meta-24). Give the house-style phrases one form across the tree, such as the `{...}` run-time value notation and the `It is project-local.` sentence, and record the chosen form in `questions.md` when the human may want the other. Refresh `map.md`: one row per DR and per package, summaries current. Done when `spex lint` is clean and `map.md` names every file.
5. **Questions.** Consolidate `questions.md`: merge rows that name one defect, give every row its kind, evidence, options, and the recommended option, and mark the rows that need evidence outside this repository. Done when the human can read the file top to bottom and decide each row.

An item whose work touches only `.specs-extraction/` leaves nothing to commit; the context checks the item off and says so.

**Gate 2.** The run ends at Gate 2 with this report as its final message, every line filled; the labels stay as written, and the values and the rest of the message follow the caller's instructions:

```text
Branch: <name>, head <short hash>
Lint: <result>
Tree: <N> packages with <N> items, <N> decision records, <N> intent records
Questions: <path>, <N> open rows
Read first: <row>, <row>, <row>, each with one line on why
```

The human's review of the tree closes the extraction; the branch merges only by their hand.

## Advancing

The Progress section of `plan.md` is the run's state and the only hand-off between contexts.
Its items are of two kinds: the three the human owns (Gate 1, calibration, Gate 2), each checked only on the human's word, and the rest, each owned by one context.

- **One context, one item.** A context owns at most one Progress item and ends when that item is checked and committed. The commit is part of the item: no instruction from outside this skill makes it wait for a separate approval.
- **A run advances to the next human-owned item.** It starts at the first unchecked item and opens a fresh context per item without stopping in between. Where the host offers subagents, the context that invoked the skill orchestrates: it opens each item's context and the reviewer's, and carries the hand-offs between them. Where it offers none, the human opens a session per item, and each context's final message names the next item. A caller who asks for one item per run gets that: the run ends after the item, whatever the host offers.
- **The orchestrating context does none of the work.** It reads nothing of the code and writes nothing under `specs/`; its own context holds only `plan.md` and what the item contexts return, and what passes between contexts goes as a file path, never as a retelling. Whenever its context was compacted or restarted, it reads this section and `plan.md` again before opening the next context. After each item's context returns, it confirms three things before opening the next: the item is checked in `plan.md`, one new commit is in (or the context said the item left nothing to commit), and `spex lint` is clean. When any of the three fails, the run ends with a message naming the item and what is missing; nothing is retried, and the next run resumes at that item.
- **The caller's instructions reach every context.** Every context a run opens, item, reviewer, and delegate alike, receives at the top of its prompt the caller's instructions as `plan.md` records them, in the caller's words, and every message and file it writes follows them. A later caller's instruction is added to that record in its own words, and replaces an earlier one only where the two conflict.
- **A human-owned item ends the run.** Gate 1 and Gate 2 end with their reports; calibration ends with the package's path and the reviewer's findings, asking the human to read the package before the loop continues, and to write any correction they want made across the tree into the `Hand-over fix list` of `plan.md`. The human's word checks the item, and the next run starts after it.
- **A run that starts at an unchecked Gate 1 prepares it first.** It opens the delegate context of [`references/gate1-delegate.md`](references/gate1-delegate.md), which reviews `plan.md` and records its decisions there, and ends with the delegate's report; the human reads it, edits `plan.md` where they disagree, and their word checks Gate 1. Where the host offers no subagents, the human opens that context themselves.
- **Uncommitted `specs/` changes at the start of a run** belong to the most recently checked item when the log holds no commit for it, and are committed for it before the run continues; otherwise they are the first unchecked item's unfinished draft, and that item's context starts from them.

When `.specs-extraction/plan.md` exists, the run reads it first and continues at the first unchecked item; nothing from an earlier context's memory counts.
