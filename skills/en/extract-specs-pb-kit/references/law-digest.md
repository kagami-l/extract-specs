# Law digest for extraction

The law is the target project's `specs/meta.md` and `specs/decisions/000-spec-structure-format.md`, read in full before this file.
This digest ranks the law by how often it bites during extraction, records the house style mature trees follow, and settles the judgment calls the law leaves open.
Where this digest and the law disagree, the law wins.

## Law ranked for extraction

| Item | What it demands | How it bites during extraction |
| --- | --- | --- |
| meta-13 | a package is a closed set of subjects for one shared intent | one package per surface or convention, never per directory, per source file, or per class |
| meta-34 | complete and exact for its intent; no gap, no excess, no requirement another spec states | a behavior has exactly one owning package; others cite it |
| meta-29 | one requirement per item; cases and steps after the colon | a function with three branches is one item with three cases, or three items when the triggers differ |
| meta-30 | sections `Intent`, `External Behavior`, `Internal Behavior` (optional), `Verification`, `References` (optional), in that order | topic subsections live inside the Behavior and Verification sections |
| meta-14, meta-16 | every peer relationship is an inline citation at the exact phrase, pointing at the peer's External Behavior; no trace lines | a peer dependency on hidden behavior means the behavior was misclassified Internal |
| meta-20 | a test item cites each behavior it verifies at the assertion, within its own package | Verification citations stay inside the file |
| meta-21, meta-33 | integration and system tests only; Verification covers every behavior | the known deviation: thin Verification, gaps recorded |
| meta-15, meta-8 | a package reads in full without following a link; each item is self-contained | a citation never replaces words |
| meta-25, meta-23 | one sentence per line; minimal, bullets and tables over prose | an item is a statement plus an attachment, not a paragraph |
| meta-27 | authoring language as `specs/meta.md` declares | every spec word, including Intents, DRs, and `map.md` rows |
| meta-12, meta-11 | a released ID is permanent; a new item takes the lowest free number | nothing here is released: renumber freely before hand-over |
| meta-4, meta-24, meta-35 | a DR has Status, Context, Decision, Consequences; it records decisions and constraints, not implementation | a DR for a choice with alternatives, never for trivia |
| meta-5, meta-28, meta-18 | an IR has Status, Intent, Deliverables, Tasks, Verification; it is disposable; no spec cites an IR | gap IRs are the only IRs this process writes |
| meta-19 | an external reference is a numbered marker to an authoritative URL in `References` | cite the framework's or protocol's official docs, never a blog |

## House style of mature trees

Not law, but every lint-clean tree in the wild follows it:

- Title line `# <pack>: <Title>`.
- Intent in two or three sentences: what the package lets its users do; what it owns and what it leaves to others.
- Items as `### <pack>-<N>` directly under a section, or as `#### <pack>-<N>` under a `### Topic` subsection; one form per file.
- An attachment is a bullet list, numbered steps, a table, or a fenced block, placed after the statement's final colon.
- A DR citation sits in parentheses right after the phrase it supports: `([DR-003](../decisions/003-storage.md))`.
- `map.md` has one row per DR and one per package, each with a summary short enough to pick the file by.
- SPDX header lines appear only when the project's own files carry them; scaffold's framework files keep their upstream lines regardless.

## Judgment calls

### External or Internal

Answer in order; the first decisive answer classifies the line.

1. Who is this package's user: a human role, or a component that calls it? Name them in the Intent.
2. Can that user observe the outcome without reading the source? External. CLI flags and output, exit codes, HTTP status and payload, UI text, config keys and their defaults, file and schema formats, error messages, and anything a test outside the package asserts are all observable.
3. Does another package's behavior rely on it? External, whatever the user sees.
4. Is it invisible to the user but consequential: caching, retries, ordering, idempotency, storage layout, concurrency limits, cleanup? Internal.
5. Is it visible only as code structure: class names, helper functions, module boundaries, which file does what? Not an item.

### Direction of a citation

- A binding citation runs from the behavior that relies to the behavior relied on: the caller cites the callee's External Behavior at the phrase that uses it.
- A callee's trigger names its caller in prose, such as "when the assistant asks for a complete response", and cites nothing: being triggered is not a dependency (meta-14 binds dependencies only).
- A reverse row in a ledger's parked table records that the later package must cite this one; it never adds a citation to this package.
- The result is a tree whose citations point one way, so the dependency direction that ordered the writing stays readable afterwards.

### A program driven by definition files

- Where the source is a set of definition files that a program in the project reads and acts on, such as a compiler's emission rules, a workflow engine's step definitions, or a schema the code validates against, the items take that program as subject: "the compiler shall emit …", never "the definition file contains …".
- Each rule the program applies is a behavior with the definition line and the program's code as its evidence; the files' layout and naming are a convention only where a contributor writing a new definition relies on them.

### Where a command or route lives

- A thin adapter, one that parses arguments and calls one behavior of another package, is specified by that package; `app workflow env list` belongs with the environment manager.
- A command with option semantics, dispatch order, output formats, or exit codes of its own is a surface and gets a CLI package that cites the behaviors it drives.
- An HTTP API is one surface and one package while one team and one client own it; split by route group only when the groups have different users.

### A suspected bug

- Specify the behavior as the code performs it today, in the owning package, at the level of "aborts with the error raised"; the text of an uncaught exception is not a contract and stays in the question.
- Log it in `questions.md` with the evidence and what the intended behavior appears to be.
- Ask nothing: the human reads the list at Gate 2, and the fix, if any, is a later intent.

### Level of detail

- A stated value earns its place when a user or peer would notice it changing: the line length contributors format to, the Python floor, the branch a workflow triggers on, the environment variable a job needs.
- A value only the tool reads stays in its configuration file, which remains the source: the version tag of a CI action, the exact pin a lock file records, make's exit status, the characters of a divider line. A spec that restates such values is a copy that goes stale on the next routine update.
- A multi-step command is specified by what it checks or changes and where it stops, in the order a user sees; echo lines and cosmetics are left out.
- A lookup table a tool holds, such as an extension list, an exclusion glob set, or a comment-marker map, is specified by its categories with one or two examples each, naming the tool's file as the list's source; the table itself stays in that file. The lines an item keeps are the ones with a reader in the repository: a marker table that covers Ada and Haskell in a TypeScript project is the script's, not the contract's.
- Behavior a framework supplies by default is the framework's, not the project's: click's unknown-command message, Poetry's derived classifiers, pytest's collection rule. The item states the project's choice that configures the framework and leaves the framework's own output to its documentation.
- The test for an attachment row is the same as for an item: would anyone outside the tool act differently if this row were wrong?
- meta-34's "sufficient to reimplement" is met when a reimplementation would satisfy the same users and peers; byte-identical help text, echo lines, or metadata listings are not the bar.

### An absence

- A requirement states what the project does. An absence, such as a file with no header, an image with no notice, or a placeholder left unfilled, is a requirement only when something relies on it: a test asserts it, a peer package cites it, or a document prescribes it.
- An absence nothing relies on is a ledger note, and a question when a human might want it filled; it is never a `shall` item or a case under one.
- The one standing exception is a convention a package exists to state, such as "files carry no license header and the root `LICENSE` is the sole statement", where the absence is the convention itself.

### Unit, integration, or system

- System: the test drives the product through its outer interface, or runs under an end-to-end framework such as Playwright, Cypress, or a CLI harness spawning the real binary.
- Integration: the test crosses a module boundary, touches real IO (files, sockets, a database, a subprocess), or exercises a process boundary.
- Unit: everything else, including tests that replace every collaborator with a double.
- Only integration and system tests may appear in Verification. A unit test still counts as evidence in the ledger.

### What a Verification item needs

- An executor that exists today: a test file, a commit hook, a CI job, or a review step a document prescribes and someone performs.
- A check nothing performs is a gap line in the ledger, never a test item, even when a scaffold seed shipped one.
- An assertion that would fail were the behavior wrong. A test that runs through a behavior's path and asserts only an exit code, or a result that holds whether or not the behavior does, exercises the behavior without verifying it: it is evidence in the ledger and the behavior is a gap line.
- A convention package with no executor keeps its `Verification` section with one line naming the absence; the gap becomes an intent record at hand-over.

### What a ledger line carries

- The candidate behavior in one sentence, stated as the code does it today.
- Evidence: `path:line` of the code, or the test's file and name, or the doc section, each path written in full from the project root, never shortened to an alias or left relative to a heading, so a tool can follow it. Two pieces of evidence beat one when a doc and the code agree.
- Another item is never evidence. A behavior reasoned out from items already written, such as "the proposal step saves nothing, so a failed state offers no action", still needs the code that performs it, or it has no ledger line and no item.
- The classification and, once written, the item ID.
- A behavior where the doc and the code disagree is written as the code does it, with the disagreement copied to `questions.md`.

### What a DR is in an old project

- A choice that had alternatives and still shapes the code: framework, storage engine, protocol, process model, compatibility promise, dependency policy.
- Status is Accepted, because the project lives with it.
- Context comes from commits, issues, changelog entries, and docs as found. A rationale no source records is written as `Rationale unrecorded`.
- The threshold is whether a newcomer would otherwise rediscover the choice from code and wonder why.

### What lint catches and what it leaves to you

`spex lint` is mechanical: directory layout, section names and order, item ID headings and uniqueness, citation form and targets, peer citations landing in External Behavior, Verification citing same-file behaviors, trace lines, reference markers, record sections, `map.md` rows, and an advisory warning on an item whose prose carries more than one sentence.
It cannot see truth, completeness, classification, language, or a second requirement hidden in one sentence.
Those belong to the self-check and the reviewer in `rubric.md`.
