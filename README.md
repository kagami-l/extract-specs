# kgm/extract-specs

[中文说明](#中文说明)

A Spex spec package that writes a lawful `specs/` tree for an existing project that has none, as-is and evidence-backed.

It holds two things:

- the playbook `extract-specs`, compiled and packaged for the Spex app, which runs the extraction step by step, each step in a fresh Captain context;
- the skill `extract-specs-pb-kit`, the rule files (`SKILL.md`, `references/`, `templates/`) the playbook follows.
  It exists only for this playbook and is not meant to be invoked directly.

## Requirements

- A Spex app on Playbook 18 that compiles and runs playbooks without player roles.
- A Captain agent the app can drive, such as a signed-in Claude Code.
- A project to extract specs from: a fresh clone with a clean worktree and no `specs/` directory.

## Install

1. In the Spex app, open Playbooks and switch to your own group.
2. Choose **Add from Git** and fill in:

   | Field | Value |
   | --- | --- |
   | Spec package name | `kgm/extract-specs` |
   | Repository URL | `https://github.com/kagami-l/extract-specs.git` |
   | Branch, tag or commit | a release tag, such as `v0.1.0` |
   | Folder inside it | leave empty |

3. **Enable** `extract-specs` in your own group.
   Installing alone does not enable it.
   It has no roles to bind and no options to fill.

## Run

1. Add the project as a local project in the app and open it.
2. Start the playbook with a sentence after the command, for example:

   ```text
   /extract-specs Use the branch name specs-extraction.
   ```

   The sentence is recorded in `.specs-extraction/plan.md` and followed by every step; use it for the branch name and the language to write in.
   The bare command without a sentence only reports status.
3. The run pauses three times for you: Gate 1 (review the plan), calibration (review the first package), and Gate 2 (accept the tree).
   Reply in the same session to continue.

The specs land on a new branch, one commit per step.
Working files stay in `.specs-extraction/`, which ignores itself.
After an interruption, `/extract-specs <a sentence>` resumes at the first unchecked step of `plan.md`.

## Where the rules come from

Each run copies the kit into `.specs-extraction/kit/` first.
By default it takes the `extract-specs-pb-kit` skill where Spex exports it: the project's `.claude/skills/` or `.agents/skills/`, else the same folders in your home.
The path it used is recorded in `.specs-extraction/kit-source`.
To use another copy, set the playbook's `kitDir` option to its path.

## License

Apache-2.0.

## 中文说明

这是一个 Spex spec 包：为一个还没有 `specs/` 的已有项目，按代码写出一套合规的规约树，忠于现状、每条都有证据。

包里有两样东西：

- playbook `extract-specs`：已为 Spex app 编译、打包好，一步一步地完成抽取，每一步都由 Captain 新开一段上下文来做；
- 技能 `extract-specs-pb-kit`：playbook 所依据的规则文件（`SKILL.md`、`references/`、`templates/`）。
  它只为这个 playbook 而存在，不要直接调用。

### 前提

- 基于 Playbook 18、能编译和运行没有角色的 playbook 的 Spex app。
- app 能驱动的 Captain agent，例如已登录的 Claude Code。
- 要抽取规约的项目：最好是一个新 clone 的副本，工作区干净，还没有 `specs/` 目录。

### 安装

1. 在 Spex app 里打开 Playbooks，切换到自己组。
2. 选 **Add from Git**，填写：

   | 字段 | 填写 |
   | --- | --- |
   | Spec package name | `kgm/extract-specs` |
   | Repository URL | `https://github.com/kagami-l/extract-specs.git` |
   | Branch, tag or commit | 一个发版标签，例如 `v0.1.0` |
   | Folder inside it | 留空 |

3. 在自己组里**启用** `extract-specs`。
   只安装不会自动启用。
   它没有角色要绑定，也没有必须填的选项。

### 运行

1. 在 app 里把项目加为本地项目，并打开它。
2. 输入命令，后面带一句话，例如：

   ```text
   /extract-specs 分支名用 specs-extraction，用中文写。
   ```

   这句话会记进 `.specs-extraction/plan.md`，之后每一步都照着做；常用来指定分支名和写作语言。
   只输入命令、不带文字时，只会报告当前状态。
3. 运行中有三处会停下来等你：关卡 1（审阅计划）、校准（审阅第一个包）、关卡 2（验收整棵规约树）。
   在同一个会话里回复即可继续。

规约写在一个新分支上，每一步一个提交。
工作文件放在 `.specs-extraction/`，它自己忽略自己。
中断之后，再输入 `/extract-specs <一句话>`，会从 `plan.md` 里第一个没完成的步骤接着做。

### 规则从哪来

每次运行先把 kit 复制进 `.specs-extraction/kit/`。
默认取 Spex 导出的 `extract-specs-pb-kit` 技能：先找项目的 `.claude/skills/` 或 `.agents/skills/`，再找主目录下的同样两处。
实际用到的路径记在 `.specs-extraction/kit-source`。
想用另一份 kit，把 playbook 的 `kitDir` 选项设为它的路径。

### 许可证

Apache-2.0。
