# Extract specs

`extract-specs` writes a lawful `specs/` tree for an existing project that has none, as-is and evidence-backed, under the rules of the spec-extraction kit.
It runs in the root of the project's Git repository and advances through the Progress section of `.specs-extraction/plan.md` one step at a time, each step in a fresh Captain context, pausing only where the human owns the next step.

Roles:

The role list is empty: Captain performs every step itself.

The host may supply `<kit-dir>`, the path of the spec-extraction kit directory: `SKILL.md` with its `references/` and `templates/`.
Where the host supplies none, `<kit-dir>` defaults to `auto`: the kit is the `extract-specs-pb-kit` skill of this playbook's spec package where Spex installs it, under `.spex/packages/kgm/extract-specs/` in the project for a project's environment, else in the clone of the user's own group's spex repository under the Spex home; else where an earlier Spex exported it, the project's `.claude/skills/` or `.agents/skills/`, else the same folders under the user's home.
The caller supplies optional instructions for Setup, such as the branch name, as `<caller-input>`.

A work step is a fresh Captain call that knows only its instruction, the repository, and `.specs-extraction/`.
A check step runs one shell command in the project root and has exactly two outcomes: the first when the command exits zero, the second when it exits nonzero.
Every work step's prompt ends, after its own instruction, with the shared work-step instruction.

## Entry

### extract-specs-1

When the caller starts `extract-specs`, Captain shall run:

> mkdir -p .specs-extraction && { grep -qxF '*' .specs-extraction/.gitignore 2>/dev/null || printf '%s\n' '*' >> .specs-extraction/.gitignore; } && kit='<kit-dir>' && if [ "$kit" = auto ]; then kit=; installed=.spex/packages/kgm/extract-specs/skills/en/extract-specs-pb-kit; spexhome="${SPEX_HOME:-$HOME/.spex}"; own="$(sed -n 's/^own: *//p' "$spexhome/home.yaml" 2>/dev/null | head -n 1)"; for d in "$installed" "$spexhome/workspace/$own/$own-spex/$installed" .claude/skills/extract-specs-pb-kit .agents/skills/extract-specs-pb-kit "$HOME/.claude/skills/extract-specs-pb-kit" "$HOME/.agents/skills/extract-specs-pb-kit"; do if [ -f "$d/SKILL.md" ]; then kit=$d; break; fi; done; fi && test -n "$kit" && test -f "$kit/SKILL.md" && rm -rf .specs-extraction/kit && cp -R "$kit" .specs-extraction/kit && test -f .specs-extraction/kit/SKILL.md && (cd "$kit" && pwd -P) > .specs-extraction/kit-source

Results:
- `kitReady`: The command exits zero; continue with the plan check.
- `kitMissing`: The command exits nonzero; extract-specs then ends in failure: no kit was found in the host's kit directory, or, for `auto`, where Spex installs the skill or an earlier Spex exported it, or the kit could not be copied.

## Dispatch

Dispatch picks the next step from the state of `.specs-extraction/plan.md`: it starts at the plan check, and each check continues with the step its outcome names.
Every work step returns to the plan check through the checks in "After a step".

### extract-specs-2

When the kit refresh results in `kitReady` or the worktree check results in `worktreeClean`, Captain shall run:

> test -e .specs-extraction/plan.md

Results:
- `planPresent`: The command exits zero; continue with the survey check.
- `planAbsent`: The command exits nonzero; continue with the start check.

### extract-specs-25

When the plan check results in `planAbsent` or the start gate results in `startHandled`, Captain shall run:

> test -z "$(git status --porcelain)"

Results:
- `startClean`: The command exits zero; continue with Setup.
- `startDirty`: The command exits nonzero; continue with the start gate.

### extract-specs-3

When the plan check results in `planPresent`, Captain shall run:

> grep -q '`[<]pack[>]`' .specs-extraction/plan.md

Results:
- `surveyPending`: The command exits zero; continue with Survey.
- `surveyDone`: The command exits nonzero; continue with the item record.

### extract-specs-4

When the survey check results in `surveyDone`, Captain shall run:

> awk 'index($0, "## Progress") == 1 { inside = 1; next } index($0, "## ") == 1 { inside = 0 } inside && index($0, "- [ ] ") == 1 { print; exit }' .specs-extraction/plan.md > .specs-extraction/current-item && test -s .specs-extraction/current-item

Results:
- `itemRecorded`: The command exits zero; continue with the Gate 1 check.
- `noItemLeft`: The command exits nonzero; extract-specs then completes successfully: every Progress item is checked and the extraction is complete.

### extract-specs-5

When the item record results in `itemRecorded`, Captain shall run:

> case "$(cat .specs-extraction/current-item)" in '- [ ] Gate 1:'*|'- [ ] Gate 1：'*) true ;; *) false ;; esac

Results:
- `gateOne`: The command exits zero; continue with the delegate check.
- `notGateOne`: The command exits nonzero; continue with the calibration check.

### extract-specs-6

When the Gate 1 check results in `gateOne`, Captain shall run:

> grep -q '^## Gate 1 decisions' .specs-extraction/plan.md

Results:
- `delegateDone`: The command exits zero; continue with Gate 1.
- `delegatePending`: The command exits nonzero; continue with the Gate 1 delegate.

### extract-specs-7

When the Gate 1 check results in `notGateOne`, Captain shall run:

> case "$(cat .specs-extraction/current-item)" in '- [ ] Calibration:'*|'- [ ] Calibration：'*) true ;; *) false ;; esac

Results:
- `calibration`: The command exits zero; continue with Calibration.
- `notCalibration`: The command exits nonzero; continue with the Gate 2 check.

### extract-specs-8

When the calibration check results in `notCalibration`, Captain shall run:

> case "$(cat .specs-extraction/current-item)" in '- [ ] Gate 2:'*|'- [ ] Gate 2：'*) true ;; *) false ;; esac

Results:
- `gateTwo`: The command exits zero; continue with Gate 2.
- `notGateTwo`: The command exits nonzero; continue with the package check.

### extract-specs-9

When the Gate 2 check results in `notGateTwo`, Captain shall run:

> case "$(cat .specs-extraction/current-item)" in '- [ ] `'*) true ;; *) false ;; esac

Results:
- `package`: The command exits zero; continue with the package draft.
- `otherItem`: The command exits nonzero; continue with the item step.

## Start gate

### extract-specs-26

When the start check results in `startDirty`, Captain shall bring the worktree to Boss, relaying the complete caller input in quotes:

> > Caller input: <caller-input>
>
> The extraction starts only from a clean worktree, and this one holds uncommitted changes. They belong to Boss, the human owner: your step puts them in front of Boss and does only what Boss's word allows.
> There is no `plan.md` yet: the caller input above is the caller's instructions, and a branch it names is the extraction's branch, not one for these changes.
> Before Boss has replied, ask Boss how to proceed. List every path `git status --porcelain` prints with its status, and name the current branch. Say that Boss may commit or clean the changes themselves and reply when done, or let you commit them, naming a branch if they want one other than the current branch.
> After Boss lets you commit, stage and commit exactly the paths Boss's reply covers and nothing else Boss has staged. Read the changes first and write each commit's message for what it changes, in the form the repository's history shows, with no trailer; split unrelated changes into separate commits. Commit on the branch Boss names, creating it from the current commit where it does not exist, else on the current branch without switching, and stay on that branch.
> After committing, ask Boss again: tell Boss the branch, and each commit's hash and message, and ask Boss to reply when the extraction may continue.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

Results:
- `startHandled`: Boss replied that they committed or cleaned the changes, or Boss replied to Captain's question reporting the commits Boss allowed; continue with the start check. A question to Boss alone, or commits not yet reported to Boss in a question, support no outcome.
- `startDeclined`: Boss declined to clean the worktree. Output shall include `startReport: <verbatim final text>`. extract-specs then ends in failure and returns startReport to its caller.

## Setup

### extract-specs-10

When the start check results in `startClean`, Captain shall set up the extraction, relaying the complete caller input in quotes:

> > Caller input: <caller-input>
>
> Your step is Phase 1, Setup, of SKILL.md, with the caller input above as the caller's instructions: take the branch name, the agents to scaffold for, and the language from it wherever it gives them, and record it in `plan.md` as Phase 1 states.
> The workflow copied the kit in before you started, so `.specs-extraction/` already exists and ignores itself through its own `.gitignore`; copy the templates from the kit into it.
> A dirty worktree ends your step as Phase 1 states: report the dirty paths and stop there.
> Your step is done when Setup's completion criterion in SKILL.md holds.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

Results:
- `setUp`: Setup's completion criterion holds; continue with the lint check.
- `dirtyStart`: The worktree was dirty at the start and Captain reported the dirty paths. Output shall include `setupReport: <verbatim final text>`. extract-specs then ends in failure and returns setupReport to its caller.

## Survey

### extract-specs-11

When the survey check results in `surveyPending`, Captain shall survey the project:

> Your step is Phase 2, Survey, of SKILL.md: fill `plan.md` and `questions.md` in `.specs-extraction/` until the survey's completion criterion holds.
> When an earlier attempt left them partly filled, continue from what is there; when a criterion of Setup is unmet, meet it first.
> Your step ends at that criterion: the Gate 1 delegate and the human's review are later steps of the workflow.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

## Gate 1 delegate

### extract-specs-12

When the delegate check results in `delegatePending`, Captain shall run the Gate 1 delegate:

> Your step is the Gate 1 delegate: follow `references/gate1-delegate.md` in the kit.
> Write the report its section D describes to `.specs-extraction/gate1-report.md` as well as ending with it.
> Your step is done when section C is recorded in `plan.md` and `questions.md` and the report file holds every part of section D.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

## Gate 1

### extract-specs-13

When the delegate check results in `delegateDone`, or after the Gate 1 delegate step, Captain shall bring Gate 1 to Boss:

> Gate 1 belongs to Boss, the human owner: their word checks it. Your step puts the plan in front of Boss and records that word.
> Before Boss has replied, ask Boss to review the plan. Base the question on `.specs-extraction/gate1-report.md` where it exists, `.specs-extraction/plan.md`, and `.specs-extraction/questions.md`, and make it complete in itself: the path of `plan.md`; the delegate's verdict and numbered decisions, in brief; the open questions Gate 1 should settle; and how many Progress items follow Gate 1, each a fresh context. Ask Boss to edit `plan.md` wherever they disagree, then reply with approval or with the changes they want made.
> After Boss replies with changes, make them in `plan.md` and `questions.md` and ask again, naming what you changed.
> When Boss's reply gives an instruction for the rest of the run, add it in Boss's words to the caller's instructions that the Setup section of `plan.md` records.
> After Boss approves, check the current item, the line in `.specs-extraction/current-item`, off in `plan.md`, adding the word human and today's date in parentheses.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

Results:
- `approved`: Boss's reply approved the plan and Captain checked the Gate 1 line off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.

## Calibration

### extract-specs-14

When the calibration check results in `calibration`, Captain shall bring the calibration package to Boss:

> Calibration belongs to Boss, the human owner: their word checks it. The current item, the line in `.specs-extraction/current-item`, names the calibration package, written just before; Boss reads it before the loop continues.
> Before Boss has replied, ask Boss to read the package. Make the question complete in itself: the paths of the package file and its ledger, and the reviewer's findings from the report named after the package in `.specs-extraction/reviews/`, each with its disposition from the ledger. Ask Boss to reply with approval or with the changes they want, and to write any correction they want made across the tree into the `Hand-over fix list` of `plan.md`.
> After Boss replies with changes, record each decision the reply states in `plan.md` under a dated `## Calibration decisions` heading placed before `## Progress`, write each correction it wants made across the tree into the `Hand-over fix list`, make the changes it asks of the package with `spex lint` clean and one commit in the form Phase 4 step 8 of SKILL.md states, and ask again, naming what you changed.
> When Boss's reply gives an instruction for the rest of the run, add it in Boss's words to the caller's instructions that the Setup section of `plan.md` records.
> After Boss approves, record any decision the approval states the same way and check the current item off in `plan.md`, adding the word human and today's date in parentheses.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

Results:
- `approved`: Boss's reply approved the package and Captain checked the calibration item off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.

## Gate 2

### extract-specs-15

When the Gate 2 check results in `gateTwo`, Captain shall prepare the Gate 2 report:

> Your step is Gate 2 of SKILL.md: check the branch, `spex lint`, and the counts the report states, then write the Gate 2 report exactly as SKILL.md shapes it, every line filled, to `.specs-extraction/gate2-report.md`, and end with the same report.
> Gate 2 belongs to Boss: the report hands them the tree, and their review closes the extraction.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

Results:
- `reported`: Captain wrote the filled Gate 2 report to `.specs-extraction/gate2-report.md` and ended with it. Output shall include `gate2Report: <verbatim final text>`. extract-specs then completes successfully: the Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and gate2Report returns to its caller.

## Package

A package item runs as the draft, the draft check, the review, the review check, and the finish, in that order.

### extract-specs-16

When the package check results in `package`, Captain shall draft the package:

> Your step drafts the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start.
> Do steps 1 to 6 of Phase 4 in SKILL.md for it, then commit the draft, every change your step made under `specs/`, in the form step 8 states.
> When an earlier attempt of this item left a draft, continue from it.
> Leave the current item unchecked: a fresh reviewer reads the committed draft next, and a later step answers the review and checks the item off.
> Your step is done when the draft is committed, `spex lint` is clean, and the worktree is clean.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

### extract-specs-17

When the package draft step completes, Captain shall run:

> test -z "$(git status --porcelain)" && git rev-parse HEAD > .specs-extraction/review-base

Results:
- `draftCommitted`: The command exits zero; continue with the review.
- `draftUncommitted`: The command exits nonzero; extract-specs then ends in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.

### extract-specs-18

When the draft check results in `draftCommitted`, Captain shall review the package:

> Your step is the fresh-context review of Phase 4 step 7 in SKILL.md for the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start. Follow the reviewer protocol in `references/rubric.md`.
> The package's draft is the latest commit. Your material is the package file, its ledger in `.specs-extraction/ledger/`, and the code; read the draft commit as well, and review every other spec it changed the same way.
> The reviewer protocol keeps `plan.md` from you, except its Setup section, which records the caller's instructions: print that section alone with this command, and read nothing else of `plan.md`:
>
>     awk 'index($0, "## ") == 1 { if (on) exit; on = index($0, "## Setup") == 1 } on' .specs-extraction/plan.md
>
> Write your report to a file named after the package in `.specs-extraction/reviews/`, every finding numbered with its evidence, and end with the same report.
> Your step reads and reports: leave every file outside `.specs-extraction/reviews/`, and the Git history, as you found them.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

### extract-specs-19

When the package review step completes, Captain shall run:

> test -z "$(git status --porcelain)" && test "$(git rev-parse HEAD)" = "$(cat .specs-extraction/review-base)"

Results:
- `reviewReadOnly`: The command exits zero; continue with the finish.
- `reviewChangedRepository`: The command exits nonzero; extract-specs then ends in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.

### extract-specs-20

When the review check results in `reviewReadOnly`, Captain shall finish the package:

> Your step completes the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start. Its draft is committed, and a fresh reviewer's report is in `.specs-extraction/reviews/`, in the file named after the package.
> Read the package, its ledger, and the report, and answer every finding as Phase 4 step 7 in SKILL.md requires: list it in the ledger's Review section as returned, with its disposition, and fix each finding you accept.
> Then repeat the self-check of step 6 with `spex lint` clean, commit the fixes in the form step 8 states when any file outside `.specs-extraction/` changed, and check the current item off in `plan.md`.
> Your step is done when every finding has its disposition in the ledger, the current item is checked, `spex lint` is clean, and the worktree is clean.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

## Item

### extract-specs-21

When the package check results in `otherItem`, Captain shall do the current item:

> Your step is the current item, the line in `.specs-extraction/current-item`, done as SKILL.md states for it: `Decision records written` is Phase 3; `Hand-over` and each `Hand-over N:` item belong to Phase 5; any other line is done as the line itself states.
> Finish with the item's commit in the form SKILL.md states (an item whose work touches only `.specs-extraction/` leaves none), and check the item off in `plan.md`.
> Your step is done when the item is checked, `spex lint` is clean, and the worktree is clean.
>
> The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.
> You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.
> Earlier steps reach you only through the repository and `.specs-extraction/`.
> Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.
> Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.
> End with a short report: what you did, what you committed, and anything the human or the next step needs to know.

## After a step

### extract-specs-22

When Gate 1 results in `approved`, Calibration results in `approved`, the package finish step completes, or the item step completes, Captain shall run:

> ! grep -qxF -f .specs-extraction/current-item .specs-extraction/plan.md

Results:
- `itemChecked`: The command exits zero; continue with the lint check.
- `itemUnchecked`: The command exits nonzero; extract-specs then ends in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.

### extract-specs-23

When Setup results in `setUp`, the Survey step completes, or the progress check results in `itemChecked`, Captain shall run:

> spex="$(grep -o '@sublang/spex@[0-9][0-9.]*' .specs-extraction/kit/SKILL.md | head -n 1)" && test -n "$spex" && npx -y "$spex" lint

Results:
- `lintClean`: The command exits zero; continue with the worktree check.
- `lintFailed`: The command exits nonzero; extract-specs then ends in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.

### extract-specs-24

When the lint check results in `lintClean`, Captain shall run:

> test -z "$(git status --porcelain)"

Results:
- `worktreeClean`: The command exits zero; continue with the plan check.
- `worktreeDirty`: The command exits nonzero; extract-specs then ends in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.

## Optimizations

- extract-specs-1: captain → script
- extract-specs-2: captain → script
- extract-specs-25: captain → script
- extract-specs-3: captain → script
- extract-specs-4: captain → script
- extract-specs-5: captain → script
- extract-specs-6: captain → script
- extract-specs-7: captain → script
- extract-specs-8: captain → script
- extract-specs-9: captain → script
- extract-specs-17: captain → script
- extract-specs-19: captain → script
- extract-specs-22: captain → script
- extract-specs-23: captain → script
- extract-specs-24: captain → script
