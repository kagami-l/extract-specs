// extract-specs.playbook/extract-specs.fsm.ts
import { assign, fromPromise, setup } from "xstate";
var RESUMABLE_STATE_IDS = [
  "startGate",
  "setup",
  "survey",
  "gateOneDelegate",
  "gateOne",
  "calibration",
  "gateTwo",
  "draftPackage",
  "reviewPackage",
  "finishPackage",
  "doItem"
];
var INTERRUPT_TARGET_IDS = [
  "refreshKit",
  "checkPlan",
  "checkStart",
  "checkSurvey",
  "recordItem",
  "checkGateOne",
  "checkDelegate",
  "checkCalibration",
  "checkGateTwo",
  "checkPackage",
  "startGate",
  "setup",
  "survey",
  "gateOneDelegate",
  "gateOne",
  "calibration",
  "gateTwo",
  "draftPackage",
  "checkDraftCommitted",
  "reviewPackage",
  "checkReviewReadOnly",
  "finishPackage",
  "doItem",
  "checkItemChecked",
  "checkLint",
  "checkWorktree"
];
var SCRIPT_GUARDS = [
  "kitReady",
  "kitMissing",
  "planPresent",
  "planAbsent",
  "startClean",
  "startDirty",
  "surveyPending",
  "surveyDone",
  "itemRecorded",
  "noItemLeft",
  "gateOne",
  "notGateOne",
  "delegateDone",
  "delegatePending",
  "calibration",
  "notCalibration",
  "gateTwo",
  "notGateTwo",
  "package",
  "otherItem",
  "draftCommitted",
  "draftUncommitted",
  "reviewReadOnly",
  "reviewChangedRepository",
  "itemChecked",
  "itemUnchecked",
  "lintClean",
  "lintFailed",
  "worktreeClean",
  "worktreeDirty"
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmpty(value) {
  return typeof value === "string" && value.trim() !== "";
}
function outputOf(event) {
  if (!isRecord(event)) return void 0;
  const output = event["output"];
  return isRecord(output) ? output : void 0;
}
function isScriptGuard(value) {
  return typeof value === "string" && SCRIPT_GUARDS.some((guard) => guard === value);
}
function scriptOutput(event) {
  const output = outputOf(event);
  if (output === void 0) return void 0;
  const guard = output["guard"];
  const exitStatus = output["exitStatus"];
  if (!isScriptGuard(guard) || typeof exitStatus !== "number" || !Number.isInteger(exitStatus)) {
    return void 0;
  }
  return { guard, exitStatus };
}
function captainOutput(event) {
  const output = outputOf(event);
  if (output === void 0) return void 0;
  const startReport = output["startReport"];
  const setupReport = output["setupReport"];
  const gate2Report = output["gate2Report"];
  const question = output["question"];
  switch (output["guard"]) {
    case "startHandled":
      return { guard: "startHandled" };
    case "startDeclined":
      return nonEmpty(startReport) ? { guard: "startDeclined", startReport } : void 0;
    case "setUp":
      return { guard: "setUp" };
    case "dirtyStart":
      return nonEmpty(setupReport) ? { guard: "dirtyStart", setupReport } : void 0;
    case "done":
      return { guard: "done" };
    case "approved":
      return { guard: "approved" };
    case "reported":
      return nonEmpty(gate2Report) ? { guard: "reported", gate2Report } : void 0;
    case "needsBossReply":
      return nonEmpty(question) ? { guard: "needsBossReply", question } : void 0;
    default:
      return void 0;
  }
}
function normalizeError(error) {
  if (error instanceof Error) {
    return typeof error.stack === "string" ? { name: error.name, message: error.message, stack: error.stack } : { name: error.name, message: error.message };
  }
  return { name: "Error", message: typeof error === "string" ? error : "Unknown actor error" };
}
function errorOf(event) {
  return isRecord(event) ? event["error"] : void 0;
}
function shellQuote(value) {
  return `'${value.split("'").join("'\\''")}'`;
}
function bindShellWord(command, word, value) {
  return typeof value === "string" && value !== "" ? command.split(word).join(shellQuote(value)) : command;
}
function hasReplyFor(context, stateId) {
  return context.pendingBossQuestion?.resumeStateId === stateId && nonEmpty(context.bossReply);
}
function captainInput(context, base) {
  const pending = context.pendingBossQuestion;
  if (pending === void 0 || pending.resumeStateId !== base.stateId) return base;
  return context.bossReply === void 0 ? { ...base, pendingBossQuestion: pending } : { ...base, pendingBossQuestion: pending, bossReply: context.bossReply };
}
function terminalOutput(context) {
  switch (context.terminalOutcome) {
    case "reported":
      return { outcome: "reported", gate2Report: context.gate2Report ?? "" };
    case "startDeclined":
      return { outcome: "startDeclined", startReport: context.startReport ?? "" };
    case "dirtyStart":
      return { outcome: "dirtyStart", setupReport: context.setupReport ?? "" };
    case "noItemLeft":
    case "kitMissing":
    case "draftUncommitted":
    case "reviewChangedRepository":
    case "itemUnchecked":
    case "lintFailed":
    case "worktreeDirty":
      return { outcome: context.terminalOutcome };
    default:
      throw new Error("extract-specs reached a final state without a terminal outcome");
  }
}
function scriptResult(guard, zeroExit) {
  return ({ event }) => {
    const output = scriptOutput(event);
    return output !== void 0 && output.guard === guard && output.exitStatus === 0 === zeroExit;
  };
}
function captainResult(guard) {
  return ({ event }) => captainOutput(event)?.guard === guard;
}
function afterBossReply(guard, stateId) {
  return ({ context, event }) => captainOutput(event)?.guard === guard && hasReplyFor(context, stateId);
}
function askBoss(stateId, sourceItem) {
  return {
    guard: captainResult("needsBossReply"),
    target: "awaitBossReply",
    actions: { type: "setPendingBossQuestion", params: { stateId, sourceItem } }
  };
}
function invalidCaptainOutput(stateId) {
  return {
    target: "failed",
    actions: ["clearBossReplyContext", { type: "rememberInvalidOutput", params: { stateId } }]
  };
}
function invalidScriptOutput(stateId) {
  return {
    target: "failed",
    actions: { type: "rememberInvalidOutput", params: { stateId } }
  };
}
var captainError = {
  target: "failed",
  actions: ["clearBossReplyContext", "rememberError"]
};
var scriptError = {
  target: "failed",
  actions: "rememberError"
};
function bossInterrupts(ids) {
  return ids.map(
    (id) => ({
      guard: ({ event }) => event.type === "BOSS_INTERRUPT" && event.targetId === id,
      target: `#${id}`,
      reenter: true,
      actions: "clearBossReplyContext"
    })
  );
}
function resumableStates(ids) {
  return ids.map(
    (id) => ({
      guard: ({ context, event }) => event.type === "BOSS_REPLY" && nonEmpty(event.answer) && context.pendingBossQuestion?.resumeStateId === id && (event.questionId === void 0 || event.questionId === context.pendingBossQuestion.questionId),
      target: `#${id}`,
      actions: "acceptBossReply"
    })
  );
}
var extractSpecsMachine = setup({
  types: {
    context: {},
    events: {},
    input: {},
    output: {}
  },
  actors: {
    captain: fromPromise(async () => {
      throw new Error("captain actor must be provided by the runner");
    }),
    script: fromPromise(async () => {
      throw new Error("script actor must be provided by the runner");
    })
  },
  actions: {
    startRun: assign(({ context, event }) => ({
      callerInput: event.type === "BOSS_INTENT" && typeof event.bossIntent === "string" ? event.bossIntent : context.callerInput,
      pendingBossQuestion: void 0,
      bossReply: void 0
    })),
    clearBossReplyContext: assign({ pendingBossQuestion: void 0, bossReply: void 0 }),
    setPendingBossQuestion: assign(
      ({ event }, params) => {
        const output = captainOutput(event);
        return {
          pendingBossQuestion: {
            questionId: params.stateId,
            resumeStateId: params.stateId,
            sourceItem: params.sourceItem,
            asker: { kind: "captain" },
            question: output?.guard === "needsBossReply" ? output.question : ""
          },
          bossReply: void 0
        };
      }
    ),
    acceptBossReply: assign(({ context, event }) => ({
      bossReply: event.type === "BOSS_REPLY" ? event.answer : context.bossReply
    })),
    rememberError: assign(({ event }) => ({ lastError: normalizeError(errorOf(event)) })),
    rememberInvalidOutput: assign((_args, params) => ({
      lastError: {
        name: "InvalidActorOutput",
        message: `State ${params.stateId} returned output that matches none of its declared results.`
      }
    })),
    rememberInvalidReply: assign({
      lastError: {
        name: "InvalidBossReply",
        message: "BOSS_REPLY carried an empty answer or named no pending question."
      }
    }),
    recordTerminal: assign((_args, params) => ({
      terminalOutcome: params.outcome
    })),
    recordStartReport: assign(({ event }) => {
      const output = captainOutput(event);
      return output?.guard === "startDeclined" ? { startReport: output.startReport, terminalOutcome: "startDeclined" } : {};
    }),
    recordSetupReport: assign(({ event }) => {
      const output = captainOutput(event);
      return output?.guard === "dirtyStart" ? { setupReport: output.setupReport, terminalOutcome: "dirtyStart" } : {};
    }),
    recordGate2Report: assign(({ event }) => {
      const output = captainOutput(event);
      return output?.guard === "reported" ? { gate2Report: output.gate2Report, terminalOutcome: "reported" } : {};
    })
  }
}).createMachine({
  id: "extract-specs",
  description: "Writes a lawful specs/ tree for an existing project, advancing through the Progress section of .specs-extraction/plan.md one step at a time.",
  initial: "ready",
  context: ({ input }) => ({
    kitDir: input.kitDir,
    callerInput: input.callerInput ?? ""
  }),
  output: ({ context }) => terminalOutput(context),
  on: {
    BOSS_INTERRUPT: bossInterrupts(INTERRUPT_TARGET_IDS)
  },
  states: {
    ready: {
      id: "ready",
      description: "Waiting for the caller to start extract-specs.",
      meta: { playbook: { stateId: "ready", description: "Waiting for the caller to start extract-specs." } },
      tags: ["playbook.parked"],
      on: {
        BOSS_INTENT: { target: "refreshKit", actions: "startRun" }
      }
    },
    // ----- Entry -----------------------------------------------------------
    refreshKit: {
      id: "refreshKit",
      description: "Refresh the kit copy in .specs-extraction/kit from the kit directory, or from the installed or exported extract-specs-pb-kit skill when it is auto.",
      meta: {
        playbook: {
          stateId: "refreshKit",
          description: "Refresh the kit copy in .specs-extraction/kit from the kit directory, or from the installed or exported extract-specs-pb-kit skill when it is auto."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: ({ context }) => ({
          stateId: "refreshKit",
          sourceItem: "extract-specs-1",
          command: bindShellWord(`mkdir -p .specs-extraction && { grep -qxF '*' .specs-extraction/.gitignore 2>/dev/null || printf '%s\\n' '*' >> .specs-extraction/.gitignore; } && kit='<kit-dir>' && if [ "$kit" = auto ]; then kit=; installed=.spex/packages/merico-ai/extract-specs/skills/en/extract-specs-pb-kit; spexhome="\${SPEX_HOME:-$HOME/.spex}"; own="$(sed -n 's/^own: *//p' "$spexhome/home.yaml" 2>/dev/null | head -n 1)"; for d in "$installed" "$spexhome/workspace/$own/$own-spex/$installed" .claude/skills/extract-specs-pb-kit .agents/skills/extract-specs-pb-kit "$HOME/.claude/skills/extract-specs-pb-kit" "$HOME/.agents/skills/extract-specs-pb-kit"; do if [ -f "$d/SKILL.md" ]; then kit=$d; break; fi; done; fi && test -n "$kit" && test -f "$kit/SKILL.md" && rm -rf .specs-extraction/kit && cp -R "$kit" .specs-extraction/kit && test -f .specs-extraction/kit/SKILL.md && (cd "$kit" && pwd -P) > .specs-extraction/kit-source`, "'<kit-dir>'", context.kitDir),
          result: {
            kitReady: "The command exits zero; continue with the plan check.",
            kitMissing: "The command exits nonzero; extract-specs then ends in failure: no kit was found in the host's kit directory, or, for `auto`, where Spex installs the skill or an earlier Spex exported it, or the kit could not be copied."
          }
        }),
        onDone: [
          { guard: scriptResult("kitReady", true), target: "checkPlan" },
          {
            guard: scriptResult("kitMissing", false),
            target: "kitMissing",
            actions: { type: "recordTerminal", params: { outcome: "kitMissing" } }
          },
          invalidScriptOutput("refreshKit")
        ],
        onError: scriptError
      }
    },
    // ----- Dispatch --------------------------------------------------------
    checkPlan: {
      id: "checkPlan",
      description: "Check whether .specs-extraction/plan.md exists.",
      meta: { playbook: { stateId: "checkPlan", description: "Check whether .specs-extraction/plan.md exists." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkPlan",
          sourceItem: "extract-specs-2",
          command: "test -e .specs-extraction/plan.md",
          result: {
            planPresent: "The command exits zero; continue with the survey check.",
            planAbsent: "The command exits nonzero; continue with the start check."
          }
        }),
        onDone: [
          { guard: scriptResult("planPresent", true), target: "checkSurvey" },
          { guard: scriptResult("planAbsent", false), target: "checkStart" },
          invalidScriptOutput("checkPlan")
        ],
        onError: scriptError
      }
    },
    checkStart: {
      id: "checkStart",
      description: "Check that the worktree is clean before the extraction starts.",
      meta: {
        playbook: {
          stateId: "checkStart",
          description: "Check that the worktree is clean before the extraction starts."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkStart",
          sourceItem: "extract-specs-25",
          command: 'test -z "$(git status --porcelain)"',
          result: {
            startClean: "The command exits zero; continue with Setup.",
            startDirty: "The command exits nonzero; continue with the start gate."
          }
        }),
        onDone: [
          { guard: scriptResult("startClean", true), target: "setup" },
          { guard: scriptResult("startDirty", false), target: "startGate" },
          invalidScriptOutput("checkStart")
        ],
        onError: scriptError
      }
    },
    checkSurvey: {
      id: "checkSurvey",
      description: "Check whether the survey is still pending.",
      meta: { playbook: { stateId: "checkSurvey", description: "Check whether the survey is still pending." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkSurvey",
          sourceItem: "extract-specs-3",
          command: "grep -q '`[<]pack[>]`' .specs-extraction/plan.md",
          result: {
            surveyPending: "The command exits zero; continue with Survey.",
            surveyDone: "The command exits nonzero; continue with the item record."
          }
        }),
        onDone: [
          { guard: scriptResult("surveyPending", true), target: "survey" },
          { guard: scriptResult("surveyDone", false), target: "recordItem" },
          invalidScriptOutput("checkSurvey")
        ],
        onError: scriptError
      }
    },
    recordItem: {
      id: "recordItem",
      description: "Record the current item, the first unchecked line of the Progress section.",
      meta: {
        playbook: {
          stateId: "recordItem",
          description: "Record the current item, the first unchecked line of the Progress section."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "recordItem",
          sourceItem: "extract-specs-4",
          command: `awk 'index($0, "## Progress") == 1 { inside = 1; next } index($0, "## ") == 1 { inside = 0 } inside && index($0, "- [ ] ") == 1 { print; exit }' .specs-extraction/plan.md > .specs-extraction/current-item && test -s .specs-extraction/current-item`,
          result: {
            itemRecorded: "The command exits zero; continue with the Gate 1 check.",
            noItemLeft: "The command exits nonzero; extract-specs then completes successfully: every Progress item is checked and the extraction is complete."
          }
        }),
        onDone: [
          { guard: scriptResult("itemRecorded", true), target: "checkGateOne" },
          {
            guard: scriptResult("noItemLeft", false),
            target: "completed",
            actions: { type: "recordTerminal", params: { outcome: "noItemLeft" } }
          },
          invalidScriptOutput("recordItem")
        ],
        onError: scriptError
      }
    },
    checkGateOne: {
      id: "checkGateOne",
      description: "Check whether the current item is Gate 1.",
      meta: { playbook: { stateId: "checkGateOne", description: "Check whether the current item is Gate 1." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkGateOne",
          sourceItem: "extract-specs-5",
          command: `case "$(cat .specs-extraction/current-item)" in '- [ ] Gate 1:'*|'- [ ] Gate 1\uFF1A'*) true ;; *) false ;; esac`,
          result: {
            gateOne: "The command exits zero; continue with the delegate check.",
            notGateOne: "The command exits nonzero; continue with the calibration check."
          }
        }),
        onDone: [
          { guard: scriptResult("gateOne", true), target: "checkDelegate" },
          { guard: scriptResult("notGateOne", false), target: "checkCalibration" },
          invalidScriptOutput("checkGateOne")
        ],
        onError: scriptError
      }
    },
    checkDelegate: {
      id: "checkDelegate",
      description: "Check whether the Gate 1 delegate has recorded its decisions.",
      meta: {
        playbook: {
          stateId: "checkDelegate",
          description: "Check whether the Gate 1 delegate has recorded its decisions."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkDelegate",
          sourceItem: "extract-specs-6",
          command: "grep -q '^## Gate 1 decisions' .specs-extraction/plan.md",
          result: {
            delegateDone: "The command exits zero; continue with Gate 1.",
            delegatePending: "The command exits nonzero; continue with the Gate 1 delegate."
          }
        }),
        onDone: [
          { guard: scriptResult("delegateDone", true), target: "gateOne" },
          { guard: scriptResult("delegatePending", false), target: "gateOneDelegate" },
          invalidScriptOutput("checkDelegate")
        ],
        onError: scriptError
      }
    },
    checkCalibration: {
      id: "checkCalibration",
      description: "Check whether the current item is the calibration item.",
      meta: {
        playbook: {
          stateId: "checkCalibration",
          description: "Check whether the current item is the calibration item."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkCalibration",
          sourceItem: "extract-specs-7",
          command: `case "$(cat .specs-extraction/current-item)" in '- [ ] Calibration:'*|'- [ ] Calibration\uFF1A'*) true ;; *) false ;; esac`,
          result: {
            calibration: "The command exits zero; continue with Calibration.",
            notCalibration: "The command exits nonzero; continue with the Gate 2 check."
          }
        }),
        onDone: [
          { guard: scriptResult("calibration", true), target: "calibration" },
          { guard: scriptResult("notCalibration", false), target: "checkGateTwo" },
          invalidScriptOutput("checkCalibration")
        ],
        onError: scriptError
      }
    },
    checkGateTwo: {
      id: "checkGateTwo",
      description: "Check whether the current item is Gate 2.",
      meta: { playbook: { stateId: "checkGateTwo", description: "Check whether the current item is Gate 2." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkGateTwo",
          sourceItem: "extract-specs-8",
          command: `case "$(cat .specs-extraction/current-item)" in '- [ ] Gate 2:'*|'- [ ] Gate 2\uFF1A'*) true ;; *) false ;; esac`,
          result: {
            gateTwo: "The command exits zero; continue with Gate 2.",
            notGateTwo: "The command exits nonzero; continue with the package check."
          }
        }),
        onDone: [
          { guard: scriptResult("gateTwo", true), target: "gateTwo" },
          { guard: scriptResult("notGateTwo", false), target: "checkPackage" },
          invalidScriptOutput("checkGateTwo")
        ],
        onError: scriptError
      }
    },
    checkPackage: {
      id: "checkPackage",
      description: "Check whether the current item names a package.",
      meta: { playbook: { stateId: "checkPackage", description: "Check whether the current item names a package." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkPackage",
          sourceItem: "extract-specs-9",
          command: `case "$(cat .specs-extraction/current-item)" in '- [ ] \`'*) true ;; *) false ;; esac`,
          result: {
            package: "The command exits zero; continue with the package draft.",
            otherItem: "The command exits nonzero; continue with the item step."
          }
        }),
        onDone: [
          { guard: scriptResult("package", true), target: "draftPackage" },
          { guard: scriptResult("otherItem", false), target: "doItem" },
          invalidScriptOutput("checkPackage")
        ],
        onError: scriptError
      }
    },
    // ----- Start gate ------------------------------------------------------
    startGate: {
      id: "startGate",
      description: "Bring the dirty worktree to Boss before the extraction starts.",
      meta: {
        playbook: { stateId: "startGate", description: "Bring the dirty worktree to Boss before the extraction starts." }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "startGate",
          sourceItem: "extract-specs-26",
          prompt: [
            "> Caller input: <caller-input>",
            "",
            "The extraction starts only from a clean worktree, and this one holds uncommitted changes. They belong to Boss, the human owner: your step puts them in front of Boss and does only what Boss's word allows.",
            "There is no `plan.md` yet: the caller input above is the caller's instructions, and a branch it names is the extraction's branch, not one for these changes.",
            "Before Boss has replied, ask Boss how to proceed. List every path `git status --porcelain` prints with its status, and name the current branch. Say that Boss may commit or clean the changes themselves and reply when done, or let you commit them, naming a branch if they want one other than the current branch.",
            "After Boss lets you commit, stage and commit exactly the paths Boss's reply covers and nothing else Boss has staged. Read the changes first and write each commit's message for what it changes, in the form the repository's history shows, with no trailer; split unrelated changes into separate commits. Commit on the branch Boss names, creating it from the current commit where it does not exist, else on the current branch without switching, and stay on that branch.",
            "After committing, ask Boss again: tell Boss the branch, and each commit's hash and message, and ask Boss to reply when the extraction may continue.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            startHandled: "Boss replied that they committed or cleaned the changes, or Boss replied to Captain's question reporting the commits Boss allowed; continue with the start check. A question to Boss alone, or commits not yet reported to Boss in a question, support no outcome.",
            startDeclined: "Boss declined to clean the worktree. Output shall include `startReport: <verbatim final text>`. extract-specs then ends in failure and returns startReport to its caller.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          },
          callerInput: context.callerInput
        }),
        onDone: [
          {
            guard: afterBossReply("startHandled", "startGate"),
            target: "checkStart",
            actions: "clearBossReplyContext"
          },
          {
            guard: afterBossReply("startDeclined", "startGate"),
            target: "startDeclined",
            actions: ["clearBossReplyContext", "recordStartReport"]
          },
          askBoss("startGate", "extract-specs-26"),
          invalidCaptainOutput("startGate")
        ],
        onError: captainError
      }
    },
    // ----- Setup -----------------------------------------------------------
    setup: {
      id: "setup",
      description: "Set up the extraction, Phase 1 of SKILL.md.",
      meta: { playbook: { stateId: "setup", description: "Set up the extraction, Phase 1 of SKILL.md." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "setup",
          sourceItem: "extract-specs-10",
          prompt: [
            "> Caller input: <caller-input>",
            "",
            "Your step is Phase 1, Setup, of SKILL.md, with the caller input above as the caller's instructions: take the branch name, the agents to scaffold for, and the language from it wherever it gives them, and record it in `plan.md` as Phase 1 states.",
            "The workflow copied the kit in before you started, so `.specs-extraction/` already exists and ignores itself through its own `.gitignore`; copy the templates from the kit into it.",
            "A dirty worktree ends your step as Phase 1 states: report the dirty paths and stop there.",
            "Your step is done when Setup's completion criterion in SKILL.md holds.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            setUp: "Setup's completion criterion holds; continue with the lint check.",
            dirtyStart: "The worktree was dirty at the start and Captain reported the dirty paths. Output shall include `setupReport: <verbatim final text>`. extract-specs then ends in failure and returns setupReport to its caller.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          },
          callerInput: context.callerInput
        }),
        onDone: [
          { guard: captainResult("setUp"), target: "checkLint", actions: "clearBossReplyContext" },
          {
            guard: captainResult("dirtyStart"),
            target: "dirtyStart",
            actions: ["clearBossReplyContext", "recordSetupReport"]
          },
          askBoss("setup", "extract-specs-10"),
          invalidCaptainOutput("setup")
        ],
        onError: captainError
      }
    },
    // ----- Survey ----------------------------------------------------------
    survey: {
      id: "survey",
      description: "Survey the project, Phase 2 of SKILL.md.",
      meta: { playbook: { stateId: "survey", description: "Survey the project, Phase 2 of SKILL.md." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "survey",
          sourceItem: "extract-specs-11",
          prompt: [
            "Your step is Phase 2, Survey, of SKILL.md: fill `plan.md` and `questions.md` in `.specs-extraction/` until the survey's completion criterion holds.",
            "When an earlier attempt left them partly filled, continue from what is there; when a criterion of Setup is unmet, meet it first.",
            "Your step ends at that criterion: the Gate 1 delegate and the human's review are later steps of the workflow.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "checkLint", actions: "clearBossReplyContext" },
          askBoss("survey", "extract-specs-11"),
          invalidCaptainOutput("survey")
        ],
        onError: captainError
      }
    },
    // ----- Gate 1 delegate -------------------------------------------------
    gateOneDelegate: {
      id: "gateOneDelegate",
      description: "Run the Gate 1 delegate.",
      meta: { playbook: { stateId: "gateOneDelegate", description: "Run the Gate 1 delegate." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "gateOneDelegate",
          sourceItem: "extract-specs-12",
          prompt: [
            "Your step is the Gate 1 delegate: follow `references/gate1-delegate.md` in the kit.",
            "Write the report its section D describes to `.specs-extraction/gate1-report.md` as well as ending with it.",
            "Your step is done when section C is recorded in `plan.md` and `questions.md` and the report file holds every part of section D.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "gateOne", actions: "clearBossReplyContext" },
          askBoss("gateOneDelegate", "extract-specs-12"),
          invalidCaptainOutput("gateOneDelegate")
        ],
        onError: captainError
      }
    },
    // ----- Gate 1 ----------------------------------------------------------
    gateOne: {
      id: "gateOne",
      description: "Bring Gate 1 to Boss and record their word on the plan.",
      meta: {
        playbook: { stateId: "gateOne", description: "Bring Gate 1 to Boss and record their word on the plan." }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "gateOne",
          sourceItem: "extract-specs-13",
          prompt: [
            "Gate 1 belongs to Boss, the human owner: their word checks it. Your step puts the plan in front of Boss and records that word.",
            "Before Boss has replied, ask Boss to review the plan. Base the question on `.specs-extraction/gate1-report.md` where it exists, `.specs-extraction/plan.md`, and `.specs-extraction/questions.md`, and make it complete in itself: the path of `plan.md`; the delegate's verdict and numbered decisions, in brief; the open questions Gate 1 should settle; and how many Progress items follow Gate 1, each a fresh context. Ask Boss to edit `plan.md` wherever they disagree, then reply with approval or with the changes they want made.",
            "After Boss replies with changes, make them in `plan.md` and `questions.md` and ask again, naming what you changed.",
            "When Boss's reply gives an instruction for the rest of the run, add it in Boss's words to the caller's instructions that the Setup section of `plan.md` records.",
            "After Boss approves, check the current item, the line in `.specs-extraction/current-item`, off in `plan.md`, adding the word human and today's date in parentheses.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            approved: "Boss's reply approved the plan and Captain checked the Gate 1 line off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          {
            guard: afterBossReply("approved", "gateOne"),
            target: "checkItemChecked",
            actions: "clearBossReplyContext"
          },
          askBoss("gateOne", "extract-specs-13"),
          invalidCaptainOutput("gateOne")
        ],
        onError: captainError
      }
    },
    // ----- Calibration -----------------------------------------------------
    calibration: {
      id: "calibration",
      description: "Bring the calibration package to Boss and record their word on it.",
      meta: {
        playbook: {
          stateId: "calibration",
          description: "Bring the calibration package to Boss and record their word on it."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "calibration",
          sourceItem: "extract-specs-14",
          prompt: [
            "Calibration belongs to Boss, the human owner: their word checks it. The current item, the line in `.specs-extraction/current-item`, names the calibration package, written just before; Boss reads it before the loop continues.",
            "Before Boss has replied, ask Boss to read the package. Make the question complete in itself: the paths of the package file and its ledger, and the reviewer's findings from the report named after the package in `.specs-extraction/reviews/`, each with its disposition from the ledger. Ask Boss to reply with approval or with the changes they want, and to write any correction they want made across the tree into the `Hand-over fix list` of `plan.md`.",
            "After Boss replies with changes, record each decision the reply states in `plan.md` under a dated `## Calibration decisions` heading placed before `## Progress`, write each correction it wants made across the tree into the `Hand-over fix list`, make the changes it asks of the package with `spex lint` clean and one commit in the form Phase 4 step 8 of SKILL.md states, and ask again, naming what you changed.",
            "When Boss's reply gives an instruction for the rest of the run, add it in Boss's words to the caller's instructions that the Setup section of `plan.md` records.",
            "After Boss approves, record any decision the approval states the same way and check the current item off in `plan.md`, adding the word human and today's date in parentheses.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            approved: "Boss's reply approved the package and Captain checked the calibration item off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          {
            guard: afterBossReply("approved", "calibration"),
            target: "checkItemChecked",
            actions: "clearBossReplyContext"
          },
          askBoss("calibration", "extract-specs-14"),
          invalidCaptainOutput("calibration")
        ],
        onError: captainError
      }
    },
    // ----- Gate 2 ----------------------------------------------------------
    gateTwo: {
      id: "gateTwo",
      description: "Prepare the Gate 2 report.",
      meta: { playbook: { stateId: "gateTwo", description: "Prepare the Gate 2 report." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "gateTwo",
          sourceItem: "extract-specs-15",
          prompt: [
            "Your step is Gate 2 of SKILL.md: check the branch, `spex lint`, and the counts the report states, then write the Gate 2 report exactly as SKILL.md shapes it, every line filled, to `.specs-extraction/gate2-report.md`, and end with the same report.",
            "Gate 2 belongs to Boss: the report hands them the tree, and their review closes the extraction.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            reported: "Captain wrote the filled Gate 2 report to `.specs-extraction/gate2-report.md` and ended with it. Output shall include `gate2Report: <verbatim final text>`. extract-specs then completes successfully: the Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and gate2Report returns to its caller.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          {
            guard: captainResult("reported"),
            target: "gateTwoReported",
            actions: ["clearBossReplyContext", "recordGate2Report"]
          },
          askBoss("gateTwo", "extract-specs-15"),
          invalidCaptainOutput("gateTwo")
        ],
        onError: captainError
      }
    },
    // ----- Package ---------------------------------------------------------
    draftPackage: {
      id: "draftPackage",
      description: "Draft the package the current item names.",
      meta: { playbook: { stateId: "draftPackage", description: "Draft the package the current item names." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "draftPackage",
          sourceItem: "extract-specs-16",
          prompt: [
            "Your step drafts the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start.",
            "Do steps 1 to 6 of Phase 4 in SKILL.md for it, then commit the draft, every change your step made under `specs/`, in the form step 8 states.",
            "When an earlier attempt of this item left a draft, continue from it.",
            "Leave the current item unchecked: a fresh reviewer reads the committed draft next, and a later step answers the review and checks the item off.",
            "Your step is done when the draft is committed, `spex lint` is clean, and the worktree is clean.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "checkDraftCommitted", actions: "clearBossReplyContext" },
          askBoss("draftPackage", "extract-specs-16"),
          invalidCaptainOutput("draftPackage")
        ],
        onError: captainError
      }
    },
    checkDraftCommitted: {
      id: "checkDraftCommitted",
      description: "Check that the draft is committed and record the commit the review starts from.",
      meta: {
        playbook: {
          stateId: "checkDraftCommitted",
          description: "Check that the draft is committed and record the commit the review starts from."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkDraftCommitted",
          sourceItem: "extract-specs-17",
          command: 'test -z "$(git status --porcelain)" && git rev-parse HEAD > .specs-extraction/review-base',
          result: {
            draftCommitted: "The command exits zero; continue with the review.",
            draftUncommitted: "The command exits nonzero; extract-specs then ends in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item."
          }
        }),
        onDone: [
          { guard: scriptResult("draftCommitted", true), target: "reviewPackage" },
          {
            guard: scriptResult("draftUncommitted", false),
            target: "draftUncommitted",
            actions: { type: "recordTerminal", params: { outcome: "draftUncommitted" } }
          },
          invalidScriptOutput("checkDraftCommitted")
        ],
        onError: scriptError
      }
    },
    reviewPackage: {
      id: "reviewPackage",
      description: "Review the package in a fresh context.",
      meta: { playbook: { stateId: "reviewPackage", description: "Review the package in a fresh context." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "reviewPackage",
          sourceItem: "extract-specs-18",
          prompt: [
            "Your step is the fresh-context review of Phase 4 step 7 in SKILL.md for the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start. Follow the reviewer protocol in `references/rubric.md`.",
            "The package's draft is the latest commit. Your material is the package file, its ledger in `.specs-extraction/ledger/`, and the code; read the draft commit as well, and review every other spec it changed the same way.",
            "The reviewer protocol keeps `plan.md` from you, except its Setup section, which records the caller's instructions: print that section alone with this command, and read nothing else of `plan.md`:",
            "",
            `    awk 'index($0, "## ") == 1 { if (on) exit; on = index($0, "## Setup") == 1 } on' .specs-extraction/plan.md`,
            "",
            "Write your report to a file named after the package in `.specs-extraction/reviews/`, every finding numbered with its evidence, and end with the same report.",
            "Your step reads and reports: leave every file outside `.specs-extraction/reviews/`, and the Git history, as you found them.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "checkReviewReadOnly", actions: "clearBossReplyContext" },
          askBoss("reviewPackage", "extract-specs-18"),
          invalidCaptainOutput("reviewPackage")
        ],
        onError: captainError
      }
    },
    checkReviewReadOnly: {
      id: "checkReviewReadOnly",
      description: "Check that the review left the repository as it was.",
      meta: {
        playbook: {
          stateId: "checkReviewReadOnly",
          description: "Check that the review left the repository as it was."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkReviewReadOnly",
          sourceItem: "extract-specs-19",
          command: 'test -z "$(git status --porcelain)" && test "$(git rev-parse HEAD)" = "$(cat .specs-extraction/review-base)"',
          result: {
            reviewReadOnly: "The command exits zero; continue with the finish.",
            reviewChangedRepository: "The command exits nonzero; extract-specs then ends in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item."
          }
        }),
        onDone: [
          { guard: scriptResult("reviewReadOnly", true), target: "finishPackage" },
          {
            guard: scriptResult("reviewChangedRepository", false),
            target: "reviewChangedRepository",
            actions: { type: "recordTerminal", params: { outcome: "reviewChangedRepository" } }
          },
          invalidScriptOutput("checkReviewReadOnly")
        ],
        onError: scriptError
      }
    },
    finishPackage: {
      id: "finishPackage",
      description: "Finish the package: answer every review finding and check the item off.",
      meta: {
        playbook: {
          stateId: "finishPackage",
          description: "Finish the package: answer every review finding and check the item off."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "finishPackage",
          sourceItem: "extract-specs-20",
          prompt: [
            "Your step completes the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start. Its draft is committed, and a fresh reviewer's report is in `.specs-extraction/reviews/`, in the file named after the package.",
            "Read the package, its ledger, and the report, and answer every finding as Phase 4 step 7 in SKILL.md requires: list it in the ledger's Review section as returned, with its disposition, and fix each finding you accept.",
            "Then repeat the self-check of step 6 with `spex lint` clean, commit the fixes in the form step 8 states when any file outside `.specs-extraction/` changed, and check the current item off in `plan.md`.",
            "Your step is done when every finding has its disposition in the ledger, the current item is checked, `spex lint` is clean, and the worktree is clean.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "checkItemChecked", actions: "clearBossReplyContext" },
          askBoss("finishPackage", "extract-specs-20"),
          invalidCaptainOutput("finishPackage")
        ],
        onError: captainError
      }
    },
    // ----- Item ------------------------------------------------------------
    doItem: {
      id: "doItem",
      description: "Do the current item as SKILL.md states for it.",
      meta: { playbook: { stateId: "doItem", description: "Do the current item as SKILL.md states for it." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "captain",
        input: ({ context }) => captainInput(context, {
          stateId: "doItem",
          sourceItem: "extract-specs-21",
          prompt: [
            "Your step is the current item, the line in `.specs-extraction/current-item`, done as SKILL.md states for it: `Decision records written` is Phase 3; `Hand-over` and each `Hand-over N:` item belong to Phase 5; any other line is done as the line itself states.",
            "Finish with the item's commit in the form SKILL.md states (an item whose work touches only `.specs-extraction/` leaves none), and check the item off in `plan.md`.",
            "Your step is done when the item is checked, `spex lint` is clean, and the worktree is clean.",
            "",
            "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
            "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
            "Earlier steps reach you only through the repository and `.specs-extraction/`.",
            "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
            "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
            "End with a short report: what you did, what you committed, and anything the human or the next step needs to know."
          ].join("\n"),
          result: {
            done: "The acting agent completed the behavior.",
            needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`."
          }
        }),
        onDone: [
          { guard: captainResult("done"), target: "checkItemChecked", actions: "clearBossReplyContext" },
          askBoss("doItem", "extract-specs-21"),
          invalidCaptainOutput("doItem")
        ],
        onError: captainError
      }
    },
    // ----- After a step ----------------------------------------------------
    checkItemChecked: {
      id: "checkItemChecked",
      description: "Check that the current item is checked off in plan.md.",
      meta: {
        playbook: {
          stateId: "checkItemChecked",
          description: "Check that the current item is checked off in plan.md."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkItemChecked",
          sourceItem: "extract-specs-22",
          command: "! grep -qxF -f .specs-extraction/current-item .specs-extraction/plan.md",
          result: {
            itemChecked: "The command exits zero; continue with the lint check.",
            itemUnchecked: "The command exits nonzero; extract-specs then ends in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it."
          }
        }),
        onDone: [
          { guard: scriptResult("itemChecked", true), target: "checkLint" },
          {
            guard: scriptResult("itemUnchecked", false),
            target: "itemUnchecked",
            actions: { type: "recordTerminal", params: { outcome: "itemUnchecked" } }
          },
          invalidScriptOutput("checkItemChecked")
        ],
        onError: scriptError
      }
    },
    checkLint: {
      id: "checkLint",
      description: "Check that spex lint is clean, using the spex version the kit pins.",
      meta: {
        playbook: {
          stateId: "checkLint",
          description: "Check that spex lint is clean, using the spex version the kit pins."
        }
      },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkLint",
          sourceItem: "extract-specs-23",
          command: `spex="$(grep -o '@sublang/spex@[0-9][0-9.]*' .specs-extraction/kit/SKILL.md | head -n 1)" && test -n "$spex" && npx -y "$spex" lint`,
          result: {
            lintClean: "The command exits zero; continue with the worktree check.",
            lintFailed: "The command exits nonzero; extract-specs then ends in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item."
          }
        }),
        onDone: [
          { guard: scriptResult("lintClean", true), target: "checkWorktree" },
          {
            guard: scriptResult("lintFailed", false),
            target: "lintFailed",
            actions: { type: "recordTerminal", params: { outcome: "lintFailed" } }
          },
          invalidScriptOutput("checkLint")
        ],
        onError: scriptError
      }
    },
    checkWorktree: {
      id: "checkWorktree",
      description: "Check that the worktree is clean.",
      meta: { playbook: { stateId: "checkWorktree", description: "Check that the worktree is clean." } },
      tags: ["playbook.busy"],
      invoke: {
        src: "script",
        input: () => ({
          stateId: "checkWorktree",
          sourceItem: "extract-specs-24",
          command: 'test -z "$(git status --porcelain)"',
          result: {
            worktreeClean: "The command exits zero; continue with the plan check.",
            worktreeDirty: "The command exits nonzero; extract-specs then ends in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item."
          }
        }),
        onDone: [
          { guard: scriptResult("worktreeClean", true), target: "checkPlan" },
          {
            guard: scriptResult("worktreeDirty", false),
            target: "worktreeDirty",
            actions: { type: "recordTerminal", params: { outcome: "worktreeDirty" } }
          },
          invalidScriptOutput("checkWorktree")
        ],
        onError: scriptError
      }
    },
    // ----- Boss reply, recovery, and terminal states -----------------------
    awaitBossReply: {
      id: "awaitBossReply",
      description: "Waiting for Boss to answer the acting agent's question.",
      meta: {
        playbook: { stateId: "awaitBossReply", description: "Waiting for Boss to answer the acting agent's question." }
      },
      tags: ["playbook.parked"],
      on: {
        BOSS_REPLY: [
          ...resumableStates(RESUMABLE_STATE_IDS),
          { target: "failed", actions: ["clearBossReplyContext", "rememberInvalidReply"] }
        ],
        BOSS_INTENT: { target: "refreshKit", actions: "startRun" }
      }
    },
    failed: {
      id: "failed",
      description: "A step failed unexpectedly; lastError holds the cause and a fresh start restarts at the kit refresh.",
      meta: {
        playbook: {
          stateId: "failed",
          description: "A step failed unexpectedly; lastError holds the cause and a fresh start restarts at the kit refresh."
        }
      },
      tags: ["playbook.parked"],
      on: {
        BOSS_INTENT: { target: "refreshKit", actions: "startRun" }
      }
    },
    completed: {
      id: "completed",
      type: "final",
      description: "extract-specs completed successfully: every Progress item is checked and the extraction is complete.",
      meta: {
        playbook: {
          stateId: "completed",
          description: "extract-specs completed successfully: every Progress item is checked and the extraction is complete.",
          terminal: "success"
        }
      }
    },
    gateTwoReported: {
      id: "gateTwoReported",
      type: "final",
      description: "extract-specs completed successfully: the filled Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and it returned to its caller.",
      meta: {
        playbook: {
          stateId: "gateTwoReported",
          description: "extract-specs completed successfully: the filled Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and it returned to its caller.",
          terminal: "success"
        }
      }
    },
    kitMissing: {
      id: "kitMissing",
      type: "final",
      description: "extract-specs ended in failure: no kit was found in the host's kit directory, or, for auto, where Spex installs the skill or an earlier Spex exported it, or the kit could not be copied.",
      meta: {
        playbook: {
          stateId: "kitMissing",
          description: "extract-specs ended in failure: no kit was found in the host's kit directory, or, for auto, where Spex installs the skill or an earlier Spex exported it, or the kit could not be copied.",
          terminal: "failure"
        }
      }
    },
    startDeclined: {
      id: "startDeclined",
      type: "final",
      description: "extract-specs ended in failure: Boss declined to clean the worktree before the extraction started, and the start report was returned to its caller.",
      meta: {
        playbook: {
          stateId: "startDeclined",
          description: "extract-specs ended in failure: Boss declined to clean the worktree before the extraction started, and the start report was returned to its caller.",
          terminal: "failure"
        }
      }
    },
    dirtyStart: {
      id: "dirtyStart",
      type: "final",
      description: "extract-specs ended in failure: the worktree was dirty at the start, and the setup report naming the dirty paths was returned to its caller.",
      meta: {
        playbook: {
          stateId: "dirtyStart",
          description: "extract-specs ended in failure: the worktree was dirty at the start, and the setup report naming the dirty paths was returned to its caller.",
          terminal: "failure"
        }
      }
    },
    draftUncommitted: {
      id: "draftUncommitted",
      type: "final",
      description: "extract-specs ended in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.",
      meta: {
        playbook: {
          stateId: "draftUncommitted",
          description: "extract-specs ended in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.",
          terminal: "failure"
        }
      }
    },
    reviewChangedRepository: {
      id: "reviewChangedRepository",
      type: "final",
      description: "extract-specs ended in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.",
      meta: {
        playbook: {
          stateId: "reviewChangedRepository",
          description: "extract-specs ended in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.",
          terminal: "failure"
        }
      }
    },
    itemUnchecked: {
      id: "itemUnchecked",
      type: "final",
      description: "extract-specs ended in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.",
      meta: {
        playbook: {
          stateId: "itemUnchecked",
          description: "extract-specs ended in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.",
          terminal: "failure"
        }
      }
    },
    lintFailed: {
      id: "lintFailed",
      type: "final",
      description: "extract-specs ended in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.",
      meta: {
        playbook: {
          stateId: "lintFailed",
          description: "extract-specs ended in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.",
          terminal: "failure"
        }
      }
    },
    worktreeDirty: {
      id: "worktreeDirty",
      type: "final",
      description: "extract-specs ended in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.",
      meta: {
        playbook: {
          stateId: "worktreeDirty",
          description: "extract-specs ended in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.",
          terminal: "failure"
        }
      }
    }
  }
});

// extract-specs.playbook/extract-specs.playbook.ts
import {
  createXStatePlaybookRuntime,
  defaultComposeCaptainPrompt,
  snapshotJsonValue
} from "@sublang/playbook/xstate-runtime";
var DEFAULT_KIT_DIR = "auto";
var OPTION_SCHEMA = {
  kitDir: { type: "string", required: false },
  cwd: { type: "string", required: false }
};
var RESUMABLE_STATE_IDS2 = /* @__PURE__ */ new Set([
  "startGate",
  "setup",
  "survey",
  "gateOneDelegate",
  "gateOne",
  "calibration",
  "gateTwo",
  "draftPackage",
  "reviewPackage",
  "finishPackage",
  "doItem"
]);
var UNFINISHED_FINAL_STATE_IDS = /* @__PURE__ */ new Set([
  "kitMissing",
  "startDeclined",
  "dirtyStart",
  "draftUncommitted",
  "reviewChangedRepository",
  "itemUnchecked",
  "lintFailed",
  "worktreeDirty"
]);
var VERBATIM_PAYLOAD_FIELDS = /* @__PURE__ */ new Set([]);
var PLACEHOLDER_FIELDS = {};
var LABEL = "EXTRACT-SPECS";
function validateOptions(value) {
  const captured = snapshotJsonValue(value === void 0 ? {} : value, `${LABEL} runtime options`);
  if (captured === null || typeof captured !== "object" || Array.isArray(captured)) {
    throw new TypeError(`${LABEL} runtime options must be an object`);
  }
  const fields = captured;
  for (const key of Object.keys(fields)) {
    if (!Object.hasOwn(OPTION_SCHEMA, key)) {
      throw new TypeError(`${LABEL} runtime options.${key} is not declared`);
    }
  }
  for (const [key, schema] of Object.entries(OPTION_SCHEMA)) {
    if (!Object.hasOwn(fields, key)) {
      if (schema.required) throw new TypeError(`${LABEL} runtime options.${key} is required`);
    } else if (typeof fields[key] !== schema.type) {
      throw new TypeError(`${LABEL} runtime options.${key} must be a ${schema.type}`);
    }
  }
  if (Object.hasOwn(fields, "kitDir")) return captured;
  return snapshotJsonValue(
    { ...fields, kitDir: DEFAULT_KIT_DIR },
    `${LABEL} runtime options`
  );
}
var PLACEHOLDER_TOKEN = /<(#|[A-Za-z_$][A-Za-z0-9_$-]*)>/g;
var BARE_RELAY_LINE = /^> <(#|[A-Za-z_$][A-Za-z0-9_$-]*)>$/;
function placeholderField(token) {
  if (Object.hasOwn(PLACEHOLDER_FIELDS, token)) return PLACEHOLDER_FIELDS[token];
  if (token === "#") return "irNumber";
  return token.replace(/-([A-Za-z0-9_$])/g, (_match, next) => next.toUpperCase());
}
function renderPlaceholder(input, match, token) {
  const value = input[placeholderField(token)];
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return void 0;
  const { pendingBossQuestion: _question, bossReply: _reply, ...rest } = input;
  return defaultComposeCaptainPrompt({ ...rest, prompt: match }, PLACEHOLDER_FIELDS);
}
function quoteContinuation(value) {
  return value.replace(/\r?\n/g, (ending) => `${ending}> `);
}
function composeCaptainPrompt(input) {
  const fields = input;
  const parts = input.prompt.split(/(\r?\n)/);
  let body = defaultComposeCaptainPrompt({ ...input, prompt: "" }, PLACEHOLDER_FIELDS);
  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index];
    const ending = parts[index + 1] ?? "";
    const bare = BARE_RELAY_LINE.exec(line);
    if (bare !== null && fields[placeholderField(bare[1])] === "") {
      if (ending === "") body = body.replace(/\r?\n$/, "");
      continue;
    }
    const quoted = line.startsWith(">");
    body += line.replace(PLACEHOLDER_TOKEN, (match, token) => {
      const value = renderPlaceholder(input, match, token);
      if (value === void 0) return match;
      return quoted ? quoteContinuation(value) : value;
    }) + ending;
  }
  return body;
}
var runtimeSpec = {
  label: LABEL,
  compat: { artifactSchema: 3, runtimeAbi: 1 },
  snapshotOptions: validateOptions,
  machineInput: (options) => ({ kitDir: options.kitDir ?? DEFAULT_KIT_DIR }),
  entryEvent: { type: "BOSS_INTENT", textField: "bossIntent", contextField: "callerInput" },
  bossEvents: [],
  roleStates: {},
  outcomeAuthority: { governedPlayerStates: {} },
  placeholderFields: PLACEHOLDER_FIELDS,
  composeCaptainPrompt,
  transitionEventFields: ["bossIntent", "answer", "questionId", "targetId"],
  verbatimPayloadFields: VERBATIM_PAYLOAD_FIELDS,
  resumableStateIds: RESUMABLE_STATE_IDS2,
  unfinishedFinalStateIds: UNFINISHED_FINAL_STATE_IDS,
  controlContextFields: ["callerInput"]
};
var createPlaybookRuntime = createXStatePlaybookRuntime(extractSpecsMachine, runtimeSpec);
var extract_specs_playbook_default = createPlaybookRuntime;

// extract-specs.ts
var REQUIRED_ROLE_IDS = [];
var validateOptions2 = validateOptions;
var entry = {
  id: "extract-specs",
  command: "extract-specs",
  intent: "Extract specs \u2014 `extract-specs` writes a lawful `specs/` tree for an existing project that has none, as-is and evidence-backed, under the rules of the spec-extraction kit. It runs in the root of the project's Git repository and advances through the Progress section of `.specs-extraction/plan.md` one step at a time, each step in a fresh Captain context, pausing only where the human owns the next step.",
  artifactSchema: 3,
  runtimeProfile: Object.freeze({
    kind: "shared-factory",
    compat: extract_specs_playbook_default.compat
  }),
  concurrentRoleSets: [],
  requiredRoleIds: [...REQUIRED_ROLE_IDS],
  validateOptions: validateOptions2,
  createRuntime(configuredOptions, hostCapabilities) {
    const validated = validateOptions2(configuredOptions);
    return extract_specs_playbook_default({
      configuredOptions: validated,
      hostCapabilities
    });
  }
};
var extract_specs_default = entry;

// extract-specs.registry.ts
var spexRegistryContract = 3;
var extract_specs_registry_default = {
  ...extract_specs_default,
  command: "extract-specs",
  intent: "Extract a lawful, evidence-backed specs/ tree from an existing project that has none, or resume an extraction whose .specs-extraction/plan.md already exists."
};
export {
  extract_specs_registry_default as default,
  spexRegistryContract
};
