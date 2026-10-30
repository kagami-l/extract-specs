# Examples

Before-and-after pairs from calibration reviews and evaluations of four earlier extraction runs (2026-10-14 to 2026-10-24), with the project's name written as `app`; the "after" is what a human reviewer kept or the evaluation called for.
Each pair names the rule it illustrates in `law-digest.md` and `rubric.md`.

## Code to behavior item: a Makefile target

Source: a `Makefile` target that echoes a divider, runs `ruff check`, runs `ruff format --check`, and echoes `Done!`.

Before, translating the recipe line by line:

```markdown
When a contributor or a CI job runs `make check`, optionally with `DIR=<path>` in place of the default `.`, the Makefile shall run the lint and format checks through Poetry in order and stop at the first failing command with make's exit status 2:

1. print the divider line;
2. run `poetry run ruff check <DIR>` [[code-style-1](#code-style-1)];
3. run `poetry run ruff format <DIR> --check` [[code-style-2](#code-style-2)];
4. print `Done!`.

- The divider line is the output of `printf '=%.0s' {1..120}` through make's `/bin/sh`: 120 `=` characters where that shell expands braces, as bash does, and a single `=` where it does not, as dash does on Debian and Ubuntu images.
```

After, stating the contract:

```markdown
When a contributor or a CI job runs `make check`, optionally with `DIR=<path>` in place of the default `.`, the Makefile shall run through Poetry the lint check [[code-style-1](#code-style-1)] and then the format check [[code-style-2](#code-style-2)] on `<DIR>`, stopping at the first failure.
```

Rule: level of detail. Nobody acts differently if the divider or make's exit code changed; the two checks and the stop are what a contributor relies on.

## Framework default against project choice: two launch paths

Source: a console script that calls click's `main()` with defaults, and a `__main__.py` that calls it with `windows_expand_args=False`.

Before, both items described click's Windows argument expansion:

```markdown
... shall run the click group `main` [[packaging-6](#packaging-6)] with click's default launch options, which on Windows expand glob patterns, `~`, and environment variables in the arguments before parsing [[1]], and exit with the status click raises.
```

After, the console script keeps only the project's part, and `python -m app` keeps the expansion clause because the project chose it:

```markdown
... shall run the click group `main` [[packaging-6](#packaging-6)] with click's default launch options and exit with the status click raises.
```

```markdown
... shall run the click group `main` [[packaging-6](#packaging-6)] with `windows_expand_args=False`, so arguments reach the group unexpanded on Windows [[1]] ...
```

Rule: framework defaults belong to the framework; the project's configuration choice is the requirement.

## A library's or packaging tool's default as a requirement

Source: `complete_response` returns `json.dumps(response.dict())` when the `openai` SDK yields a `ChatCompletion` and `str(response)` otherwise; `pyproject.toml` names no `packages` or `include`.

Before, the item tabulated how the SDK reads each kind of HTTP body, and a packaging item restated Poetry's default contents:

```markdown
When the app asks for a complete response for a prompt record, it shall return what the `openai` SDK reads from the endpoint's answer as text, or fail, as below:

| SDK's reading | Returned |
| --- | --- |
| a chat completion | its JSON text: every field of a chat completion, null where the answer lacks it, and any further field the answer holds |
| anything else, such as the text of a body not labelled `application/json` that is not JSON | Python's `str` of it |
| none, for a body labelled `application/json` that is not JSON | nothing: the request fails with the error raised |
```

```markdown
Each distribution shall carry every file under `app/` that git does not ignore, data files included.
```

After, the project's two branches stay, and the packaging item goes, since the project configured nothing:

```markdown
When the app asks for a complete response for a prompt record, it shall return the result the `openai` SDK reads from the endpoint's answer as text:

- a chat completion: the JSON text of its fields;
- any other result: its string form.
```

Rule: level of detail. What a library does with a body, or what a packaging tool includes when the project configures nothing, is the tool's and stays in its documentation; the item states what the project's own code chooses.

## An absence written as a requirement: README images

Before:

```markdown
`README.md` shall license its two Prompt-Centric Software Development illustrations under the Creative Commons Attribution-ShareAlike 4.0 International License [[2]] by a `<sub>` note directly beneath each image, with its banner image at the top carrying no license note:
...
- `README.zh.md` carries no images.
```

After:

```markdown
`README.md` shall license its two Prompt-Centric Software Development illustrations under the Creative Commons Attribution-ShareAlike 4.0 International License [[2]] by a `<sub>` note directly beneath each image:
```

Rule: an absence nothing relies on is not a requirement. The banner image's missing note and the translated README's missing images were observations, not contracts.

## A crash written as cases: unreadable configuration

Before, one row per Python exception text observed by hand-editing the file:

```markdown
| empty, or carrying only comments | `TypeError: argument of type 'NoneType' is not iterable` |
| without a `models` key | `KeyError: 'models'` |
| with a provider or model entry whose value is empty | `TypeError: app.config.GeneralProviderConfig() argument after ** must be a mapping, not NoneType`, and the same for `GeneralModelConfig` |
```

After, one requirement and the inputs that trigger it, with the exception texts left in `questions.md`:

```markdown
Where `config.yml` cannot be brought to the schema at all, when an operation reads it, the app shall abort the operation with the error the load raises, uncaught:

- Such files include YAML that is not well-formed, an empty file, a document that is not a mapping, a file without a `models` key, and a `providers`, `models`, provider, or model entry whose value is empty.
```

Rule: a suspected bug is specified as observed, at the level of "aborts with the error raised"; an uncaught exception's message is not a contract.

## An uncaught exception's class in an item

Source: `app/store.py:208` reads a record by its hash under `assert len(prompt_data) == 1`.

Before:

```markdown
| two or more | failure with an `AssertionError` |
```

After:

```markdown
| two or more | failure with the error raised |
```

Rule: an uncaught exception is specified as failing with the error raised; neither the class an `assert` or a library throws nor its message is a contract, and where the case looks like a bug the class goes to `questions.md` as evidence. A message the project raises deliberately, such as `raise ValueError("Prompt is incomplete for shortlog.")`, may be stated where a user or peer meets it.

## Two requirements joined in one statement

Source: the legacy command runner, when a declared parameter is left unsubstituted, prints the command's README when one is readable and otherwise lists the missing names; the assistant sets function schemas when given.

Before, an `otherwise` branch and an appended absence each rode after a comma:

```markdown
When a declared parameter remains as `$name` in the first step's `run` string after substitution [[command-engine-19](#command-engine-19)], the command runner shall print the command directory's `README.md` to standard output and return `(0, "")` when a non-empty readable README exists, and otherwise print the missing parameter names to standard error and return `(-1, "")`:
```

```markdown
When function schemas are given, the assistant shall set them as the prompt's function schemas [[chat-model-17](chat-model.md#chat-model-17)] and leave the prompt without schemas when none are given.
```

After, the branch is a case of the one trigger, the internal return values give way to what the caller sees, and the absence goes:

```markdown
When a declared parameter remains as `$name` in the first step's `run` string after substitution [[command-engine-19](#command-engine-19)], the command runner shall report the missing parameters instead of running the step:

| `README.md` in the command directory | Report |
| --- | --- |
| non-empty and readable | its text on standard output, with a success status |
| missing, empty, or unreadable | the missing parameter names on standard error, with a failure status |
```

```markdown
When function schemas are given, the assistant shall set them as the prompt's function schemas [[chat-model-17](chat-model.md#chat-model-17)].
```

Rule: one requirement per item (meta-29). A clause after a comma or an `and` that adds an outcome, an `otherwise` branch, or what happens when the trigger does not occur is a second requirement: an alternative outcome of the same trigger becomes a case after the colon, a different trigger gets its own item, and an absence nothing relies on goes.

## Test to test item: an exit status verifies nothing

Source: `tests/test_cli_log.py` and `tests/test_cli_prompt.py` run `app` commands through click's `CliRunner` in a fresh git repository and assert exit code 0; the chat directories are resolved once per process and cached.

Before, the item inferred that exit 0 proves the directory behaviors:

```markdown
When `poetry run pytest` runs the system tests of `tests/test_cli_log.py` and `tests/test_cli_prompt.py` under the `git_repo` fixture of `tests/conftest.py`, each shall drive a command through click's `CliRunner` inside a fresh temporary git repository and assert exit code 0, which holds only when that repository is located as the working copy root [[chat-dirs-1](#chat-dirs-1)] and its `.chat` directory is created and used [[chat-dirs-3](#chat-dirs-3)]:

- the tests are `test_log_no_args`, `test_log_with_skip_and_max_count`, ...;
- the first of them in a process resolves the directory pair and the rest reuse it [[chat-dirs-8](#chat-dirs-8)].
```

After, a reviewer's probe passed the same tests with the cache cleared before every command, so no test item remains; the Verification section states the absence and each behavior is a gap row naming the nearest test and why it does not count:

```markdown
## Verification

No integration or system test asserts this package's behaviors today.
```

```markdown
| chat-dirs-3 | `tests/test_cli_log.py::test_log_no_args` runs `log` in a fresh git repository but asserts only exit 0 and a JSON list | system: `app log` in a subprocess from a subdirectory of a temporary git repository, asserting where `.chat` appears |
```

Rule: a test item needs an assertion that would fail were the behavior wrong (law-digest, "What a Verification item needs"); a test that runs through the path and asserts an exit status is ledger evidence, and the behavior is a gap.

## Function with no user: an API only tests call

`ConfigManager.update_model_config` and `ConfigManager.sync` are called by `tests/` and by nothing shipped.
The first draft specified both as External Behavior with a two-step merge rule; the calibration dropped the items and logged the API as a dead surface in `questions.md`.

Rule: an item names an outcome a user or peer relies on; a function only tests call has no user until the project declares its Python API a surface.

## History to decision record

Source: three commits in two weeks, `replace click with argparser`, `Reuse click for cli`, and `Use click in workflow CLI considering performance`, plus an unused `rich_click` dependency.

```markdown
## Context

The CLI has always used `click`, apart from a two-week detour.
Commit `a3f8ec4` (2024-04-28, "replace click with argparser") moved the entry point to `argparse`.
Commit `f3c6dbb` (2024-05-10, "Reuse click for cli") reverted it, and commit `6a1521a` (2024-05-11, "Use click in workflow CLI considering performance") settled the new `app workflow` group on `click` as well.
`rich_click` is declared in `pyproject.toml` but never imported.

## Decision

Every CLI group and command, including the `app workflow` subgroup, is defined with `click` [[1]].

Rationale: the workflow CLI commit records "considering performance"; the choice for the rest of the CLI is unrecorded.
```

Rule: Context is the history as found, with hashes and dates; a rationale no source records is written as unrecorded.

## A tool's lookup table copied into an item: SPDX comment markers

Source: a shell script that checks SPDX headers and chooses comment markers by file extension, in a repository whose tracked files are TypeScript, Markdown, JavaScript, YAML, and one shell script.

Before, the item carried the script's whole marker map:

```markdown
Where a file is in the licensing scope [[licensing-1](#licensing-1)], the file shall hold its SPDX lines inside its first comment block after any shebang:

- the block starts at the first line after a `#!` line and any leading blank lines;
- it is the run of consecutive lines that open, after any leading whitespace, with a comment marker for the file's extension;
...

| Extension | Comment markers |
| --- | --- |
| `md`, `markdown`, `html`, `htm`, `xml` | `<!--`, `-->` |
| `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`, `css`, `scss`, `less`, `c`, `cc`, `cpp`, `h`, `hpp`, `java`, `go`, `rs`, `swift`, `kt`, `kts` | `//`, `/*`, `*` |
| `sh`, `bash`, `zsh`, `yaml`, `yml`, `toml`, `cfg`, `conf`, `ini`, `py`, `rb`, `pl`, `tcl`, `mk` | `#` |
| `sql`, `lua`, `hs`, `ada` | `--` |
| any other or none | any of the markers above |
```

After, the item states the rule a contributor applies and leaves the map in the script:

```markdown
Where a file is in the licensing scope [[licensing-1](#licensing-1)], the file shall hold its SPDX lines inside its first comment block after any shebang, written in the comment syntax of the file's own language:

- the block starts at the first line after a `#!` line and any leading blank lines;
- it is the run of consecutive lines that open, after any leading whitespace, with a comment marker of that syntax;
...
```

The same review cut the sibling item's six exclusion lists to their category names with one or two examples each and one line naming the script as the source of the exact lists.

Rule: level of detail, the lookup-table case. A contributor writing a `.ts` file already knows its comment syntax; the rows for Ada, Haskell, and Lua have no reader in this repository and go stale with the script.

## Authoring language other than English

(pending: a Chinese pair showing identifiers kept verbatim inside localized prose, from a run on a Chinese-language project)
