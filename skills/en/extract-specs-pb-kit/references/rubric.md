# Rubric

Provisional until the first package has been reviewed by a human; the wording here is what calibration edits.
The same checklist serves the author's self-check and the fresh-context reviewer, so both grade one standard.

## Per item

| Check | Pass looks like |
| --- | --- |
| Evidence | a ledger line with `path:line` or a test name backs the item, the code itself, never an inference from other items |
| Current, not wished | the statement describes what the code does today, in the present tense of the project |
| One requirement | one GEARS statement; cases, steps, and examples sit after the colon; a second trigger or stateful precondition is a second item |
| Clauses | `Where` holds static configuration or features, `While` holds runtime state, at most one `When`, the subject is a named component or role, `shall` carries the behavior |
| Not a function | the item names an outcome a user or peer can rely on, never a function or method by its signature |
| Not a test | the item states behavior; how it is checked lives in Verification |
| Test item | a test item states the assertions and cites the behaviors they verify; what the suite fails to reach is a gap line in the ledger, written once |
| Level of detail | every stated value is one a user or peer would notice changing; tool-only values stay in their configuration file, per the detail rule of `law-digest.md` |
| Not an absence | the item requires something the project does; an absence appears only when something relies on it, per the absence rule of `law-digest.md` |
| Classification | passes the External or Internal questions of `law-digest.md`; anything a peer cites or a user observes is External |
| No duplicate | no other package states the same requirement; the owner states it, others cite |
| Citations | each peer dependency is an inline citation at the exact phrase, to the peer's External Behavior, running from the relying behavior to the relied-on one; a trigger names its caller in prose; DRs cited in parentheses |
| Language | every word in the tree's declared authoring language; identifiers, paths, and commands stay verbatim |
| Line discipline | one sentence per line outside lists, tables, and fenced blocks |

## Per package

| Check | Pass looks like |
| --- | --- |
| Intent | readable alone; names the users, what the package owns, what it leaves to others |
| Closed set | every subject in the package serves the Intent; a subject serving another intent moved out |
| Coverage | every surface row of `plan.md` assigned to this package has an item |
| Sections | `Intent`, `External Behavior`, `Internal Behavior` (optional), `Verification`, `References` (optional), in order |
| Verification | each test item cites the behaviors it verifies at the assertion; only integration and system tests; gaps listed in the ledger, not as test items |
| Map | `map.md` carries the package's row |
| Size | the package file is shorter than the source it specifies; a longer file is translating code and is cut to the contract |
| Lint | `spex lint` clean, with `spex` as `SKILL.md` pins it |

## Per DR

| Check | Pass looks like |
| --- | --- |
| Threshold | a choice with alternatives that still shapes the code |
| Sections | Status, Context, Decision, Consequences, References when an external source is cited |
| Truthful context | drawn from history and docs as found; `Rationale unrecorded` where none exists |
| No implementation | decisions and constraints, with the item-level detail left to packages |

## Reviewer protocol

The reviewer runs in a fresh context and receives the package file, the ledger, and read access to the code, the tests, and the history; it receives none of the author's reasoning.

- It reads nothing else under `.specs-extraction/`: not `plan.md`, not `questions.md`, not another package's ledger or review, since each carries the author's or another context's reasoning.
- It reads the author's pending change set (`git status`, `git diff`), and checks every change the author made to another spec file, such as an in-place correction of an earlier package, as it checks the package.
- It writes one file, `.specs-extraction/reviews/<pack>.md`, and changes nothing else in the repository; probes that need a writable directory run outside it.

1. For each item, find the evidence in the code or tests. Report every item whose evidence is missing, points elsewhere, or contradicts the statement.
2. Walk the package's subjects in the code and list observable behaviors the package lacks, at the level of detail the rubric's detail check allows: behaviors a user or peer would notice, never finer.
3. Apply the per-item and per-package tables; report each failed check with the item ID, giving over-statement (detail, absence, framework default, function with no user) the same weight as omission.
4. Write findings only to `.specs-extraction/reviews/<pack>.md`, numbered, each in the form `<item or subject>: <finding>` with its evidence (`path:line`, or the probe and its output), with no rewrite proposals; the final message gives the file's path and the number of findings.
