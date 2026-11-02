# merico-ai/extract-specs

[中文说明](#中文说明)

A Spex spec package that writes a lawful `specs/` tree for an existing project that has none, as-is and evidence-backed.

It holds two things:

- the playbook `extract-specs`, compiled and packaged for the Spex app, which runs the extraction step by step, each step in a fresh Captain context;
- the skill `extract-specs-pb-kit`, the rule files (`SKILL.md`, `references/`, `templates/`) the playbook follows.
  It exists only for this playbook and is not meant to be invoked directly.

## Requirements

- A Spex app on Playbook 18 that compiles and runs playbooks without player roles, with the project tabs Playbooks and Packages.
- A Captain agent the app can drive, such as a signed-in Claude Code.
- A project to extract specs from: a fresh clone with no `specs/` directory.
  Uncommitted changes make the run stop and ask you first; see [Run](#run).

## Install

1. In the Spex app, open any project and its **Packages** tab.
2. Under **Personal**, choose **Add…**, then **Git**, and fill in:

   | Field | Value |
   | --- | --- |
   | Repository | `https://github.com/kagami-l/extract-specs.git` |
   | Branch or tag | a release tag, such as `v0.3.0` |
   | Spec package name | `merico-ai/extract-specs` |

   The package sits at the root of the repository, so no folder inside it is needed.
   Personal packages are available in every project of yours.
3. **Enable** `extract-specs` for Personal: expand its row and choose "/extract-specs · Enable", or choose "Enable for Personal" from its menu on the project's **Playbooks** tab.
   Installing alone does not enable it.
   It has no roles to bind and no options to fill.

## Run

1. Add the project in the app and open it.
   Spex writes `spex.yaml`, `spex.lock` and lines in `.gitattributes` into it; commit them, as the Packages tab suggests, before you start.
2. Start the playbook with a sentence after the command, for example:

   ```text
   /extract-specs Use the branch name specs-extraction.
   ```

   The sentence is recorded in `.specs-extraction/plan.md` and followed by every step; use it for the branch name and the language to write in.
   The bare command without a sentence only reports status.
3. Where the worktree holds uncommitted changes, the run lists them first and asks: commit or clean them yourself and reply, or let the Captain commit them, on the current branch unless you name another; it then reports the commits and waits for your reply.
   It then pauses three times for you: Gate 1 (review the plan), calibration (review the first package), and Gate 2 (accept the tree).
   Reply in the same session to continue.

The specs land on a new branch, one commit per step.
Working files stay in `.specs-extraction/`, which ignores itself.
After an interruption, `/extract-specs <a sentence>` resumes at the first unchecked step of `plan.md`.

## Where the rules come from

Each run copies the kit into `.specs-extraction/kit/` first.
By default it takes the `extract-specs-pb-kit` skill where Spex installs it: the project's `.spex/packages/merico-ai/extract-specs/`, else your Personal packages under the Spex home (`~/.spex`, or `SPEX_HOME`).
Spex installs the skill only as the playbook's support, so it never appears among your agents' skills.
An earlier Spex that exported it is still served: the project's `.claude/skills/` or `.agents/skills/`, else the same folders in your home.
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

- 基于 Playbook 18、能编译和运行没有角色的 playbook、项目里有 Playbooks 和 Packages 标签页的 Spex app。
- app 能驱动的 Captain agent，例如已登录的 Claude Code。
- 要抽取规约的项目：最好是一个新 clone 的副本，还没有 `specs/` 目录。
  工作区有未提交的改动时，运行会先停下来问你，见[运行](#运行)。

### 安装

1. 在 Spex app 里打开任意一个项目，进入它的 **Packages** 标签页。
2. 在 **Personal** 下选 **Add…**，再选 **Git**，填写：

   | 字段 | 填写 |
   | --- | --- |
   | Repository | `https://github.com/kagami-l/extract-specs.git` |
   | Branch or tag | 一个发版标签，例如 `v0.3.0` |
   | Spec package name | `merico-ai/extract-specs` |

   包就在仓库根目录，不用填仓库里的目录。
   Personal 里的包在你的每个项目里都能用。
3. 为 Personal **启用** `extract-specs`：展开这一行，选 "/extract-specs · Enable"；或者在项目的 **Playbooks** 标签页，从它的更多菜单里选 "Enable for Personal"。
   只安装不会自动启用。
   它没有角色要绑定，也没有必须填的选项。

### 运行

1. 在 app 里添加项目，并打开它。
   Spex 会在项目里写入 `spex.yaml`、`spex.lock`，并往 `.gitattributes` 里加几行；开始之前，按 Packages 标签页的提示把它们提交。
2. 输入命令，后面带一句话，例如：

   ```text
   /extract-specs 分支名用 specs-extraction，用中文写。
   ```

   这句话会记进 `.specs-extraction/plan.md`，之后每一步都照着做；常用来指定分支名和写作语言。
   只输入命令、不带文字时，只会报告当前状态。
3. 工作区有未提交的改动时，运行会先列出这些改动并问你：可以自己提交或清理后回复，也可以让 Captain 代提交（默认提交到当前分支，你也可以指定别的分支），提交后它会报告这些提交，等你回复再继续。
   之后还有三处会停下来等你：关卡 1（审阅计划）、校准（审阅第一个包）、关卡 2（验收整棵规约树）。
   在同一个会话里回复即可继续。

规约写在一个新分支上，每一步一个提交。
工作文件放在 `.specs-extraction/`，它自己忽略自己。
中断之后，再输入 `/extract-specs <一句话>`，会从 `plan.md` 里第一个没完成的步骤接着做。

### 规则从哪来

每次运行先把 kit 复制进 `.specs-extraction/kit/`。
默认取 Spex 安装的 `extract-specs-pb-kit` 技能：先找项目的 `.spex/packages/merico-ai/extract-specs/`，再找 Spex home（`~/.spex`，或 `SPEX_HOME`）下你的 Personal 安装。
Spex 只把它当作 playbook 的附属安装，所以它不会出现在 agent 的技能目录里。
旧版 Spex 会把它导出到技能目录，这种情况也照样能找到：先找项目的 `.claude/skills/` 或 `.agents/skills/`，再找主目录下的同样两处。
实际用到的路径记在 `.specs-extraction/kit-source`。
想用另一份 kit，把 playbook 的 `kitDir` 选项设为它的路径。

### 许可证

Apache-2.0。
