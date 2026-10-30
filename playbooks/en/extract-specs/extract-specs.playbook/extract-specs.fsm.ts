// extract-specs FSM — compiled by gears2fsm from extract-specs.gears.md.
// Object artifact only: it defines the machine, actor contracts, and typed inputs;
// the linked runtime supplies every actor implementation.

import { assign, fromPromise, setup } from 'xstate';

// ---------------------------------------------------------------------------
// State identities
// ---------------------------------------------------------------------------

/** Direct-Captain working leaves; each supports Boss-reply suspension. */
export type ResumableStateId =
  | 'setup'
  | 'survey'
  | 'gateOneDelegate'
  | 'gateOne'
  | 'calibration'
  | 'gateTwo'
  | 'draftPackage'
  | 'reviewPackage'
  | 'finishPackage'
  | 'doItem';

/** Optimizer-introduced deterministic script leaves. */
export type ScriptStateId =
  | 'refreshKit'
  | 'checkPlan'
  | 'checkSurvey'
  | 'recordItem'
  | 'checkGateOne'
  | 'checkDelegate'
  | 'checkCalibration'
  | 'checkGateTwo'
  | 'checkPackage'
  | 'checkDraftCommitted'
  | 'checkReviewReadOnly'
  | 'checkItemChecked'
  | 'checkLint'
  | 'checkWorktree';

/** Every jumpable working state accepted by `BOSS_INTERRUPT`. */
export type InterruptTargetId = ResumableStateId | ScriptStateId;

export const RESUMABLE_STATE_IDS = [
  'setup',
  'survey',
  'gateOneDelegate',
  'gateOne',
  'calibration',
  'gateTwo',
  'draftPackage',
  'reviewPackage',
  'finishPackage',
  'doItem',
] as const satisfies readonly ResumableStateId[];

export const INTERRUPT_TARGET_IDS = [
  'refreshKit',
  'checkPlan',
  'checkSurvey',
  'recordItem',
  'checkGateOne',
  'checkDelegate',
  'checkCalibration',
  'checkGateTwo',
  'checkPackage',
  'setup',
  'survey',
  'gateOneDelegate',
  'gateOne',
  'calibration',
  'gateTwo',
  'draftPackage',
  'checkDraftCommitted',
  'reviewPackage',
  'checkReviewReadOnly',
  'finishPackage',
  'doItem',
  'checkItemChecked',
  'checkLint',
  'checkWorktree',
] as const satisfies readonly InterruptTargetId[];

/** This playbook declares no parallel group. */
export const concurrentRoleSets: readonly (readonly string[])[] = [];

// ---------------------------------------------------------------------------
// Boss-reply suspension
// ---------------------------------------------------------------------------

export type BossQuestionAsker =
  | { readonly kind: 'captain' }
  | { readonly kind: 'role'; readonly roleId: string };

export interface PendingBossQuestion {
  readonly questionId: ResumableStateId;
  readonly resumeStateId: ResumableStateId;
  readonly sourceItem: string;
  readonly asker: BossQuestionAsker;
  readonly question: string;
}

export const NEEDS_BOSS_REPLY_DESCRIPTION =
  "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.";

export const DEFAULT_DONE_DESCRIPTION = 'The acting agent completed the behavior.';

// ---------------------------------------------------------------------------
// Machine input, context, events, output
// ---------------------------------------------------------------------------

export interface ExtractSpecsInput {
  /**
   * Host-owned `<kit-dir>`: the path of the spec-extraction kit directory, or
   * `auto` — the host's value where it supplies no path — to use the
   * `extract-specs-pb-kit` skill of this playbook's spec package where Spex
   * exports it.
   */
  readonly kitDir: string;
  /** Optional seed for the caller's Setup instructions (`<caller-input>`). */
  readonly callerInput?: string;
}

export interface ErrorRecord {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

export type TerminalOutcome =
  | 'noItemLeft'
  | 'reported'
  | 'kitMissing'
  | 'dirtyStart'
  | 'draftUncommitted'
  | 'reviewChangedRepository'
  | 'itemUnchecked'
  | 'lintFailed'
  | 'worktreeDirty';

export interface ExtractSpecsContext {
  readonly kitDir: string;
  readonly callerInput: string;
  readonly pendingBossQuestion?: PendingBossQuestion | undefined;
  readonly bossReply?: string | undefined;
  readonly setupReport?: string | undefined;
  readonly gate2Report?: string | undefined;
  readonly terminalOutcome?: TerminalOutcome | undefined;
  readonly lastError?: ErrorRecord | undefined;
}

export type ExtractSpecsEvent =
  | { readonly type: 'BOSS_INTENT'; readonly bossIntent?: string }
  | { readonly type: 'BOSS_INTERRUPT'; readonly targetId: InterruptTargetId }
  | { readonly type: 'BOSS_REPLY'; readonly answer: string; readonly questionId?: string };

export type ExtractSpecsOutput =
  | { readonly outcome: 'noItemLeft' }
  | { readonly outcome: 'reported'; readonly gate2Report: string }
  | { readonly outcome: 'kitMissing' }
  | { readonly outcome: 'dirtyStart'; readonly setupReport: string }
  | { readonly outcome: 'draftUncommitted' }
  | { readonly outcome: 'reviewChangedRepository' }
  | { readonly outcome: 'itemUnchecked' }
  | { readonly outcome: 'lintFailed' }
  | { readonly outcome: 'worktreeDirty' };

// ---------------------------------------------------------------------------
// Actor contracts
// ---------------------------------------------------------------------------

export interface CaptainInput {
  readonly stateId: ResumableStateId;
  readonly sourceItem: string;
  readonly prompt: string;
  readonly result: Readonly<Record<string, string>>;
  readonly callerInput?: string;
  readonly pendingBossQuestion?: PendingBossQuestion;
  readonly bossReply?: string;
}

export type CaptainOutput =
  | { readonly guard: 'setUp' }
  | { readonly guard: 'dirtyStart'; readonly setupReport: string }
  | { readonly guard: 'done' }
  | { readonly guard: 'approved' }
  | { readonly guard: 'reported'; readonly gate2Report: string }
  | { readonly guard: 'needsBossReply'; readonly question: string };

export interface ScriptInput {
  readonly stateId: ScriptStateId;
  readonly sourceItem: string;
  readonly command: string;
  readonly result: Readonly<Record<string, string>>;
}

export type ScriptOutput =
  | { readonly guard: 'kitReady'; readonly exitStatus: number }
  | { readonly guard: 'kitMissing'; readonly exitStatus: number }
  | { readonly guard: 'planPresent'; readonly exitStatus: number }
  | { readonly guard: 'planAbsent'; readonly exitStatus: number }
  | { readonly guard: 'surveyPending'; readonly exitStatus: number }
  | { readonly guard: 'surveyDone'; readonly exitStatus: number }
  | { readonly guard: 'itemRecorded'; readonly exitStatus: number }
  | { readonly guard: 'noItemLeft'; readonly exitStatus: number }
  | { readonly guard: 'gateOne'; readonly exitStatus: number }
  | { readonly guard: 'notGateOne'; readonly exitStatus: number }
  | { readonly guard: 'delegateDone'; readonly exitStatus: number }
  | { readonly guard: 'delegatePending'; readonly exitStatus: number }
  | { readonly guard: 'calibration'; readonly exitStatus: number }
  | { readonly guard: 'notCalibration'; readonly exitStatus: number }
  | { readonly guard: 'gateTwo'; readonly exitStatus: number }
  | { readonly guard: 'notGateTwo'; readonly exitStatus: number }
  | { readonly guard: 'package'; readonly exitStatus: number }
  | { readonly guard: 'otherItem'; readonly exitStatus: number }
  | { readonly guard: 'draftCommitted'; readonly exitStatus: number }
  | { readonly guard: 'draftUncommitted'; readonly exitStatus: number }
  | { readonly guard: 'reviewReadOnly'; readonly exitStatus: number }
  | { readonly guard: 'reviewChangedRepository'; readonly exitStatus: number }
  | { readonly guard: 'itemChecked'; readonly exitStatus: number }
  | { readonly guard: 'itemUnchecked'; readonly exitStatus: number }
  | { readonly guard: 'lintClean'; readonly exitStatus: number }
  | { readonly guard: 'lintFailed'; readonly exitStatus: number }
  | { readonly guard: 'worktreeClean'; readonly exitStatus: number }
  | { readonly guard: 'worktreeDirty'; readonly exitStatus: number };

export type ScriptGuard = ScriptOutput['guard'];

const SCRIPT_GUARDS: readonly ScriptGuard[] = [
  'kitReady',
  'kitMissing',
  'planPresent',
  'planAbsent',
  'surveyPending',
  'surveyDone',
  'itemRecorded',
  'noItemLeft',
  'gateOne',
  'notGateOne',
  'delegateDone',
  'delegatePending',
  'calibration',
  'notCalibration',
  'gateTwo',
  'notGateTwo',
  'package',
  'otherItem',
  'draftCommitted',
  'draftUncommitted',
  'reviewReadOnly',
  'reviewChangedRepository',
  'itemChecked',
  'itemUnchecked',
  'lintClean',
  'lintFailed',
  'worktreeClean',
  'worktreeDirty',
];

// ---------------------------------------------------------------------------
// Structural narrowing helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function outputOf(event: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isRecord(event)) return undefined;
  const output = event['output'];
  return isRecord(output) ? output : undefined;
}

function isScriptGuard(value: unknown): value is ScriptGuard {
  return typeof value === 'string' && SCRIPT_GUARDS.some((guard) => guard === value);
}

/** Narrows a script actor's done event to the declared `ScriptOutput` contract. */
export function scriptOutput(event: unknown): ScriptOutput | undefined {
  const output = outputOf(event);
  if (output === undefined) return undefined;
  const guard = output['guard'];
  const exitStatus = output['exitStatus'];
  if (!isScriptGuard(guard) || typeof exitStatus !== 'number' || !Number.isInteger(exitStatus)) {
    return undefined;
  }
  // The guard is validated against the declared keys above; the union exceeds
  // TypeScript's discriminant-distribution limit, so the literal is asserted.
  return { guard, exitStatus } as ScriptOutput;
}

/** Narrows a Captain actor's done event to the declared `CaptainOutput` contract. */
export function captainOutput(event: unknown): CaptainOutput | undefined {
  const output = outputOf(event);
  if (output === undefined) return undefined;
  const setupReport = output['setupReport'];
  const gate2Report = output['gate2Report'];
  const question = output['question'];
  switch (output['guard']) {
    case 'setUp':
      return { guard: 'setUp' };
    case 'dirtyStart':
      return nonEmpty(setupReport) ? { guard: 'dirtyStart', setupReport } : undefined;
    case 'done':
      return { guard: 'done' };
    case 'approved':
      return { guard: 'approved' };
    case 'reported':
      return nonEmpty(gate2Report) ? { guard: 'reported', gate2Report } : undefined;
    case 'needsBossReply':
      return nonEmpty(question) ? { guard: 'needsBossReply', question } : undefined;
    default:
      return undefined;
  }
}

/** Normalizes an invoke error into a JSON-safe record. */
export function normalizeError(error: unknown): ErrorRecord {
  if (error instanceof Error) {
    return typeof error.stack === 'string'
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: error.name, message: error.message };
  }
  return { name: 'Error', message: typeof error === 'string' ? error : 'Unknown actor error' };
}

function errorOf(event: unknown): unknown {
  return isRecord(event) ? event['error'] : undefined;
}

/** Encodes a value as one single-quoted POSIX shell word. */
export function shellQuote(value: string): string {
  return `'${value.split("'").join("'\\''")}'`;
}

/**
 * Binds a single-quoted placeholder word (quotes included) to a shell literal.
 * An absent value keeps the placeholder literal so the step refuses instead of
 * acting on an unbound target.
 */
export function bindShellWord(command: string, word: string, value: string | undefined): string {
  return typeof value === 'string' && value !== '' ? command.split(word).join(shellQuote(value)) : command;
}

function hasReplyFor(context: ExtractSpecsContext, stateId: ResumableStateId): boolean {
  return context.pendingBossQuestion?.resumeStateId === stateId && nonEmpty(context.bossReply);
}

interface CaptainInputBase {
  readonly stateId: ResumableStateId;
  readonly sourceItem: string;
  readonly prompt: string;
  readonly result: Readonly<Record<string, string>>;
  readonly callerInput?: string;
}

/** Adds the pending question and reply selected for this working leaf. */
function captainInput(context: ExtractSpecsContext, base: CaptainInputBase): CaptainInput {
  const pending = context.pendingBossQuestion;
  if (pending === undefined || pending.resumeStateId !== base.stateId) return base;
  return context.bossReply === undefined
    ? { ...base, pendingBossQuestion: pending }
    : { ...base, pendingBossQuestion: pending, bossReply: context.bossReply };
}

export function terminalOutput(context: ExtractSpecsContext): ExtractSpecsOutput {
  switch (context.terminalOutcome) {
    case 'reported':
      return { outcome: 'reported', gate2Report: context.gate2Report ?? '' };
    case 'dirtyStart':
      return { outcome: 'dirtyStart', setupReport: context.setupReport ?? '' };
    case 'noItemLeft':
    case 'kitMissing':
    case 'draftUncommitted':
    case 'reviewChangedRepository':
    case 'itemUnchecked':
    case 'lintFailed':
    case 'worktreeDirty':
      return { outcome: context.terminalOutcome };
    default:
      throw new Error('extract-specs reached a final state without a terminal outcome');
  }
}

// ---------------------------------------------------------------------------
// Typed guard and transition helpers
// ---------------------------------------------------------------------------

/** Script result guard: the first declared guard requires exit zero, the second nonzero. */
function scriptResult(guard: ScriptGuard, zeroExit: boolean) {
  return ({ event }: { event: unknown }): boolean => {
    const output = scriptOutput(event);
    return output !== undefined && output.guard === guard && (output.exitStatus === 0) === zeroExit;
  };
}

function captainResult(guard: CaptainOutput['guard']) {
  return ({ event }: { event: unknown }): boolean => captainOutput(event)?.guard === guard;
}

/** Approval is available only after Boss has replied to this leaf's question. */
function approvedAfterBossReply(stateId: ResumableStateId) {
  return ({ context, event }: { context: ExtractSpecsContext; event: unknown }): boolean =>
    captainOutput(event)?.guard === 'approved' && hasReplyFor(context, stateId);
}

function askBoss(stateId: ResumableStateId, sourceItem: string) {
  return {
    guard: captainResult('needsBossReply'),
    target: 'awaitBossReply',
    actions: { type: 'setPendingBossQuestion', params: { stateId, sourceItem } },
  } as const;
}

function invalidCaptainOutput(stateId: ResumableStateId) {
  return {
    target: 'failed',
    actions: ['clearBossReplyContext', { type: 'rememberInvalidOutput', params: { stateId } }],
  } as const;
}

function invalidScriptOutput(stateId: ScriptStateId) {
  return {
    target: 'failed',
    actions: { type: 'rememberInvalidOutput', params: { stateId } },
  } as const;
}

const captainError = {
  target: 'failed',
  actions: ['clearBossReplyContext', 'rememberError'],
} as const;

const scriptError = {
  target: 'failed',
  actions: 'rememberError',
} as const;

/** Root `BOSS_INTERRUPT` arms: one guarded, re-entering transition per jumpable state. */
function bossInterrupts<const Ids extends readonly InterruptTargetId[]>(ids: Ids) {
  return ids.map(
    (id) =>
      ({
        guard: ({ event }: { event: ExtractSpecsEvent }): boolean =>
          event.type === 'BOSS_INTERRUPT' && event.targetId === id,
        target: `#${id}`,
        reenter: true,
        actions: 'clearBossReplyContext',
      }) as const,
  );
}

/** `BOSS_REPLY` arms: resume only the working leaf recorded by the pending question. */
function resumableStates<const Ids extends readonly ResumableStateId[]>(ids: Ids) {
  return ids.map(
    (id) =>
      ({
        guard: ({ context, event }: { context: ExtractSpecsContext; event: ExtractSpecsEvent }): boolean =>
          event.type === 'BOSS_REPLY' &&
          nonEmpty(event.answer) &&
          context.pendingBossQuestion?.resumeStateId === id &&
          (event.questionId === undefined || event.questionId === context.pendingBossQuestion.questionId),
        target: `#${id}`,
        actions: 'acceptBossReply',
      }) as const,
  );
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const extractSpecsMachine = setup({
  types: {
    context: {} as ExtractSpecsContext,
    events: {} as ExtractSpecsEvent,
    input: {} as ExtractSpecsInput,
    output: {} as ExtractSpecsOutput,
  },
  actors: {
    captain: fromPromise<CaptainOutput, CaptainInput>(async () => {
      throw new Error('captain actor must be provided by the runner');
    }),
    script: fromPromise<ScriptOutput, ScriptInput>(async () => {
      throw new Error('script actor must be provided by the runner');
    }),
  },
  actions: {
    startRun: assign(({ context, event }) => ({
      callerInput:
        event.type === 'BOSS_INTENT' && typeof event.bossIntent === 'string'
          ? event.bossIntent
          : context.callerInput,
      pendingBossQuestion: undefined,
      bossReply: undefined,
    })),
    clearBossReplyContext: assign({ pendingBossQuestion: undefined, bossReply: undefined }),
    setPendingBossQuestion: assign(
      ({ event }, params: { stateId: ResumableStateId; sourceItem: string }) => {
        const output = captainOutput(event);
        return {
          pendingBossQuestion: {
            questionId: params.stateId,
            resumeStateId: params.stateId,
            sourceItem: params.sourceItem,
            asker: { kind: 'captain' },
            question: output?.guard === 'needsBossReply' ? output.question : '',
          } satisfies PendingBossQuestion,
          bossReply: undefined,
        };
      },
    ),
    acceptBossReply: assign(({ context, event }) => ({
      bossReply: event.type === 'BOSS_REPLY' ? event.answer : context.bossReply,
    })),
    rememberError: assign(({ event }) => ({ lastError: normalizeError(errorOf(event)) })),
    rememberInvalidOutput: assign((_args, params: { stateId: InterruptTargetId }) => ({
      lastError: {
        name: 'InvalidActorOutput',
        message: `State ${params.stateId} returned output that matches none of its declared results.`,
      },
    })),
    rememberInvalidReply: assign({
      lastError: {
        name: 'InvalidBossReply',
        message: 'BOSS_REPLY carried an empty answer or named no pending question.',
      },
    }),
    recordTerminal: assign((_args, params: { outcome: TerminalOutcome }) => ({
      terminalOutcome: params.outcome,
    })),
    recordSetupReport: assign(({ event }) => {
      const output = captainOutput(event);
      return output?.guard === 'dirtyStart'
        ? { setupReport: output.setupReport, terminalOutcome: 'dirtyStart' as const }
        : {};
    }),
    recordGate2Report: assign(({ event }) => {
      const output = captainOutput(event);
      return output?.guard === 'reported'
        ? { gate2Report: output.gate2Report, terminalOutcome: 'reported' as const }
        : {};
    }),
  },
}).createMachine({
  id: 'extract-specs',
  description:
    'Writes a lawful specs/ tree for an existing project, advancing through the Progress section of .specs-extraction/plan.md one step at a time.',
  initial: 'ready',
  context: ({ input }) => ({
    kitDir: input.kitDir,
    callerInput: input.callerInput ?? '',
  }),
  output: ({ context }) => terminalOutput(context),
  on: {
    BOSS_INTERRUPT: bossInterrupts(INTERRUPT_TARGET_IDS),
  },
  states: {
    ready: {
      id: 'ready',
      description: 'Waiting for the caller to start extract-specs.',
      meta: { playbook: { stateId: 'ready', description: 'Waiting for the caller to start extract-specs.' } },
      tags: ['playbook.parked'],
      on: {
        BOSS_INTENT: { target: 'refreshKit', actions: 'startRun' },
      },
    },

    // ----- Entry -----------------------------------------------------------

    refreshKit: {
      id: 'refreshKit',
      description: 'Refresh the kit copy in .specs-extraction/kit from the kit directory, or from the exported extract-specs-pb-kit skill when it is auto.',
      meta: {
        playbook: {
          stateId: 'refreshKit',
          description: 'Refresh the kit copy in .specs-extraction/kit from the kit directory, or from the exported extract-specs-pb-kit skill when it is auto.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: ({ context }): ScriptInput => ({
          stateId: 'refreshKit',
          sourceItem: 'extract-specs-1',
          command: bindShellWord("mkdir -p .specs-extraction && { grep -qxF '*' .specs-extraction/.gitignore 2>/dev/null || printf '%s\\n' '*' >> .specs-extraction/.gitignore; } && kit='<kit-dir>' && if [ \"$kit\" = auto ]; then kit=; for d in .claude/skills/extract-specs-pb-kit .agents/skills/extract-specs-pb-kit \"$HOME/.claude/skills/extract-specs-pb-kit\" \"$HOME/.agents/skills/extract-specs-pb-kit\"; do if [ -f \"$d/SKILL.md\" ]; then kit=$d; break; fi; done; fi && test -n \"$kit\" && test -f \"$kit/SKILL.md\" && rm -rf .specs-extraction/kit && cp -R \"$kit\" .specs-extraction/kit && test -f .specs-extraction/kit/SKILL.md && (cd \"$kit\" && pwd -P) > .specs-extraction/kit-source", "'<kit-dir>'", context.kitDir),
          result: {
            kitReady: "The command exits zero; continue with the plan check.",
            kitMissing: "The command exits nonzero; extract-specs then ends in failure: no kit was found in the host's kit directory, or, for `auto`, where Spex exports the skill, or the kit could not be copied.",
          },
        }),
        onDone: [
          { guard: scriptResult('kitReady', true), target: 'checkPlan' },
          {
            guard: scriptResult('kitMissing', false),
            target: 'kitMissing',
            actions: { type: 'recordTerminal', params: { outcome: 'kitMissing' } },
          },
          invalidScriptOutput('refreshKit'),
        ],
        onError: scriptError,
      },
    },

    // ----- Dispatch --------------------------------------------------------

    checkPlan: {
      id: 'checkPlan',
      description: 'Check whether .specs-extraction/plan.md exists.',
      meta: { playbook: { stateId: 'checkPlan', description: 'Check whether .specs-extraction/plan.md exists.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkPlan',
          sourceItem: 'extract-specs-2',
          command: "test -e .specs-extraction/plan.md",
          result: {
            planPresent: "The command exits zero; continue with the survey check.",
            planAbsent: "The command exits nonzero; continue with Setup.",
          },
        }),
        onDone: [
          { guard: scriptResult('planPresent', true), target: 'checkSurvey' },
          { guard: scriptResult('planAbsent', false), target: 'setup' },
          invalidScriptOutput('checkPlan'),
        ],
        onError: scriptError,
      },
    },

    checkSurvey: {
      id: 'checkSurvey',
      description: 'Check whether the survey is still pending.',
      meta: { playbook: { stateId: 'checkSurvey', description: 'Check whether the survey is still pending.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkSurvey',
          sourceItem: 'extract-specs-3',
          command: "grep -q '`[<]pack[>]`' .specs-extraction/plan.md",
          result: {
            surveyPending: "The command exits zero; continue with Survey.",
            surveyDone: "The command exits nonzero; continue with the item record.",
          },
        }),
        onDone: [
          { guard: scriptResult('surveyPending', true), target: 'survey' },
          { guard: scriptResult('surveyDone', false), target: 'recordItem' },
          invalidScriptOutput('checkSurvey'),
        ],
        onError: scriptError,
      },
    },

    recordItem: {
      id: 'recordItem',
      description: 'Record the current item, the first unchecked line of the Progress section.',
      meta: {
        playbook: {
          stateId: 'recordItem',
          description: 'Record the current item, the first unchecked line of the Progress section.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'recordItem',
          sourceItem: 'extract-specs-4',
          command: "awk 'index($0, \"## Progress\") == 1 { inside = 1; next } index($0, \"## \") == 1 { inside = 0 } inside && index($0, \"- [ ] \") == 1 { print; exit }' .specs-extraction/plan.md > .specs-extraction/current-item && test -s .specs-extraction/current-item",
          result: {
            itemRecorded: "The command exits zero; continue with the Gate 1 check.",
            noItemLeft: "The command exits nonzero; extract-specs then completes successfully: every Progress item is checked and the extraction is complete.",
          },
        }),
        onDone: [
          { guard: scriptResult('itemRecorded', true), target: 'checkGateOne' },
          {
            guard: scriptResult('noItemLeft', false),
            target: 'completed',
            actions: { type: 'recordTerminal', params: { outcome: 'noItemLeft' } },
          },
          invalidScriptOutput('recordItem'),
        ],
        onError: scriptError,
      },
    },

    checkGateOne: {
      id: 'checkGateOne',
      description: 'Check whether the current item is Gate 1.',
      meta: { playbook: { stateId: 'checkGateOne', description: 'Check whether the current item is Gate 1.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkGateOne',
          sourceItem: 'extract-specs-5',
          command: "case \"$(cat .specs-extraction/current-item)\" in '- [ ] Gate 1:'*|'- [ ] Gate 1：'*) true ;; *) false ;; esac",
          result: {
            gateOne: "The command exits zero; continue with the delegate check.",
            notGateOne: "The command exits nonzero; continue with the calibration check.",
          },
        }),
        onDone: [
          { guard: scriptResult('gateOne', true), target: 'checkDelegate' },
          { guard: scriptResult('notGateOne', false), target: 'checkCalibration' },
          invalidScriptOutput('checkGateOne'),
        ],
        onError: scriptError,
      },
    },

    checkDelegate: {
      id: 'checkDelegate',
      description: 'Check whether the Gate 1 delegate has recorded its decisions.',
      meta: {
        playbook: {
          stateId: 'checkDelegate',
          description: 'Check whether the Gate 1 delegate has recorded its decisions.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkDelegate',
          sourceItem: 'extract-specs-6',
          command: "grep -q '^## Gate 1 decisions' .specs-extraction/plan.md",
          result: {
            delegateDone: "The command exits zero; continue with Gate 1.",
            delegatePending: "The command exits nonzero; continue with the Gate 1 delegate.",
          },
        }),
        onDone: [
          { guard: scriptResult('delegateDone', true), target: 'gateOne' },
          { guard: scriptResult('delegatePending', false), target: 'gateOneDelegate' },
          invalidScriptOutput('checkDelegate'),
        ],
        onError: scriptError,
      },
    },

    checkCalibration: {
      id: 'checkCalibration',
      description: 'Check whether the current item is the calibration item.',
      meta: {
        playbook: {
          stateId: 'checkCalibration',
          description: 'Check whether the current item is the calibration item.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkCalibration',
          sourceItem: 'extract-specs-7',
          command: "case \"$(cat .specs-extraction/current-item)\" in '- [ ] Calibration:'*|'- [ ] Calibration：'*) true ;; *) false ;; esac",
          result: {
            calibration: "The command exits zero; continue with Calibration.",
            notCalibration: "The command exits nonzero; continue with the Gate 2 check.",
          },
        }),
        onDone: [
          { guard: scriptResult('calibration', true), target: 'calibration' },
          { guard: scriptResult('notCalibration', false), target: 'checkGateTwo' },
          invalidScriptOutput('checkCalibration'),
        ],
        onError: scriptError,
      },
    },

    checkGateTwo: {
      id: 'checkGateTwo',
      description: 'Check whether the current item is Gate 2.',
      meta: { playbook: { stateId: 'checkGateTwo', description: 'Check whether the current item is Gate 2.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkGateTwo',
          sourceItem: 'extract-specs-8',
          command: "case \"$(cat .specs-extraction/current-item)\" in '- [ ] Gate 2:'*|'- [ ] Gate 2：'*) true ;; *) false ;; esac",
          result: {
            gateTwo: "The command exits zero; continue with Gate 2.",
            notGateTwo: "The command exits nonzero; continue with the package check.",
          },
        }),
        onDone: [
          { guard: scriptResult('gateTwo', true), target: 'gateTwo' },
          { guard: scriptResult('notGateTwo', false), target: 'checkPackage' },
          invalidScriptOutput('checkGateTwo'),
        ],
        onError: scriptError,
      },
    },

    checkPackage: {
      id: 'checkPackage',
      description: 'Check whether the current item names a package.',
      meta: { playbook: { stateId: 'checkPackage', description: 'Check whether the current item names a package.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkPackage',
          sourceItem: 'extract-specs-9',
          command: "case \"$(cat .specs-extraction/current-item)\" in '- [ ] `'*) true ;; *) false ;; esac",
          result: {
            package: "The command exits zero; continue with the package draft.",
            otherItem: "The command exits nonzero; continue with the item step.",
          },
        }),
        onDone: [
          { guard: scriptResult('package', true), target: 'draftPackage' },
          { guard: scriptResult('otherItem', false), target: 'doItem' },
          invalidScriptOutput('checkPackage'),
        ],
        onError: scriptError,
      },
    },

    // ----- Setup -----------------------------------------------------------

    setup: {
      id: 'setup',
      description: 'Set up the extraction, Phase 1 of SKILL.md.',
      meta: { playbook: { stateId: 'setup', description: 'Set up the extraction, Phase 1 of SKILL.md.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'setup',
            sourceItem: 'extract-specs-10',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              setUp: "Setup's completion criterion holds; continue with the lint check.",
              dirtyStart: "The worktree was dirty at the start and Captain reported the dirty paths. Output shall include `setupReport: <verbatim final text>`. extract-specs then ends in failure and returns setupReport to its caller.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
            callerInput: context.callerInput,
          }),
        onDone: [
          { guard: captainResult('setUp'), target: 'checkLint', actions: 'clearBossReplyContext' },
          {
            guard: captainResult('dirtyStart'),
            target: 'dirtyStart',
            actions: ['clearBossReplyContext', 'recordSetupReport'],
          },
          askBoss('setup', 'extract-specs-10'),
          invalidCaptainOutput('setup'),
        ],
        onError: captainError,
      },
    },

    // ----- Survey ----------------------------------------------------------

    survey: {
      id: 'survey',
      description: 'Survey the project, Phase 2 of SKILL.md.',
      meta: { playbook: { stateId: 'survey', description: 'Survey the project, Phase 2 of SKILL.md.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'survey',
            sourceItem: 'extract-specs-11',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'checkLint', actions: 'clearBossReplyContext' },
          askBoss('survey', 'extract-specs-11'),
          invalidCaptainOutput('survey'),
        ],
        onError: captainError,
      },
    },

    // ----- Gate 1 delegate -------------------------------------------------

    gateOneDelegate: {
      id: 'gateOneDelegate',
      description: 'Run the Gate 1 delegate.',
      meta: { playbook: { stateId: 'gateOneDelegate', description: 'Run the Gate 1 delegate.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'gateOneDelegate',
            sourceItem: 'extract-specs-12',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'gateOne', actions: 'clearBossReplyContext' },
          askBoss('gateOneDelegate', 'extract-specs-12'),
          invalidCaptainOutput('gateOneDelegate'),
        ],
        onError: captainError,
      },
    },

    // ----- Gate 1 ----------------------------------------------------------

    gateOne: {
      id: 'gateOne',
      description: 'Bring Gate 1 to Boss and record their word on the plan.',
      meta: {
        playbook: { stateId: 'gateOne', description: 'Bring Gate 1 to Boss and record their word on the plan.' },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'gateOne',
            sourceItem: 'extract-specs-13',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              approved: "Boss's reply approved the plan and Captain checked the Gate 1 line off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          {
            guard: approvedAfterBossReply('gateOne'),
            target: 'checkItemChecked',
            actions: 'clearBossReplyContext',
          },
          askBoss('gateOne', 'extract-specs-13'),
          invalidCaptainOutput('gateOne'),
        ],
        onError: captainError,
      },
    },

    // ----- Calibration -----------------------------------------------------

    calibration: {
      id: 'calibration',
      description: 'Bring the calibration package to Boss and record their word on it.',
      meta: {
        playbook: {
          stateId: 'calibration',
          description: 'Bring the calibration package to Boss and record their word on it.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'calibration',
            sourceItem: 'extract-specs-14',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              approved: "Boss's reply approved the package and Captain checked the calibration item off; continue with the progress check. A question to Boss, or changes made at Boss's request, support no approval.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          {
            guard: approvedAfterBossReply('calibration'),
            target: 'checkItemChecked',
            actions: 'clearBossReplyContext',
          },
          askBoss('calibration', 'extract-specs-14'),
          invalidCaptainOutput('calibration'),
        ],
        onError: captainError,
      },
    },

    // ----- Gate 2 ----------------------------------------------------------

    gateTwo: {
      id: 'gateTwo',
      description: 'Prepare the Gate 2 report.',
      meta: { playbook: { stateId: 'gateTwo', description: 'Prepare the Gate 2 report.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'gateTwo',
            sourceItem: 'extract-specs-15',
            prompt: [
              "Your step is Gate 2 of SKILL.md: check the branch, `spex lint`, and the counts the report states, then write the Gate 2 report exactly as SKILL.md shapes it, every line filled, to `.specs-extraction/gate2-report.md`, and end with the same report.",
              "Gate 2 belongs to Boss: the report hands them the tree, and their review closes the extraction.",
              "",
              "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
              "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
              "Earlier steps reach you only through the repository and `.specs-extraction/`.",
              "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
              "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              reported: "Captain wrote the filled Gate 2 report to `.specs-extraction/gate2-report.md` and ended with it. Output shall include `gate2Report: <verbatim final text>`. extract-specs then completes successfully: the Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and gate2Report returns to its caller.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          {
            guard: captainResult('reported'),
            target: 'gateTwoReported',
            actions: ['clearBossReplyContext', 'recordGate2Report'],
          },
          askBoss('gateTwo', 'extract-specs-15'),
          invalidCaptainOutput('gateTwo'),
        ],
        onError: captainError,
      },
    },

    // ----- Package ---------------------------------------------------------

    draftPackage: {
      id: 'draftPackage',
      description: 'Draft the package the current item names.',
      meta: { playbook: { stateId: 'draftPackage', description: 'Draft the package the current item names.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'draftPackage',
            sourceItem: 'extract-specs-16',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'checkDraftCommitted', actions: 'clearBossReplyContext' },
          askBoss('draftPackage', 'extract-specs-16'),
          invalidCaptainOutput('draftPackage'),
        ],
        onError: captainError,
      },
    },

    checkDraftCommitted: {
      id: 'checkDraftCommitted',
      description: 'Check that the draft is committed and record the commit the review starts from.',
      meta: {
        playbook: {
          stateId: 'checkDraftCommitted',
          description: 'Check that the draft is committed and record the commit the review starts from.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkDraftCommitted',
          sourceItem: 'extract-specs-17',
          command: "test -z \"$(git status --porcelain)\" && git rev-parse HEAD > .specs-extraction/review-base",
          result: {
            draftCommitted: "The command exits zero; continue with the review.",
            draftUncommitted: "The command exits nonzero; extract-specs then ends in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.",
          },
        }),
        onDone: [
          { guard: scriptResult('draftCommitted', true), target: 'reviewPackage' },
          {
            guard: scriptResult('draftUncommitted', false),
            target: 'draftUncommitted',
            actions: { type: 'recordTerminal', params: { outcome: 'draftUncommitted' } },
          },
          invalidScriptOutput('checkDraftCommitted'),
        ],
        onError: scriptError,
      },
    },

    reviewPackage: {
      id: 'reviewPackage',
      description: 'Review the package in a fresh context.',
      meta: { playbook: { stateId: 'reviewPackage', description: 'Review the package in a fresh context.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'reviewPackage',
            sourceItem: 'extract-specs-18',
            prompt: [
              "Your step is the fresh-context review of Phase 4 step 7 in SKILL.md for the package the current item names: the current item is the line in `.specs-extraction/current-item`, and the package is the name in backticks at its start. Follow the reviewer protocol in `references/rubric.md`.",
              "The package's draft is the latest commit. Your material is the package file, its ledger in `.specs-extraction/ledger/`, and the code; read the draft commit as well, and review every other spec it changed the same way.",
              "The reviewer protocol keeps `plan.md` from you, except its Setup section, which records the caller's instructions: print that section alone with this command, and read nothing else of `plan.md`:",
              "",
              "    awk 'index($0, \"## \") == 1 { if (on) exit; on = index($0, \"## Setup\") == 1 } on' .specs-extraction/plan.md",
              "",
              "Write your report to a file named after the package in `.specs-extraction/reviews/`, every finding numbered with its evidence, and end with the same report.",
              "Your step reads and reports: leave every file outside `.specs-extraction/reviews/`, and the Git history, as you found them.",
              "",
              "The kit in `.specs-extraction/kit/` holds the rules of this extraction: `SKILL.md`, its `references/`, and its `templates/`. Read `SKILL.md` as the rule document for your step and resolve every `references/` or `templates/` path it names inside the kit; its frontmatter is addressed to skill loaders.",
              "You are one fresh context doing one step. The workflow that called you opens every context, advances between steps, and checks `plan.md`, `spex lint`, and the worktree after you, so your step ends where its completion criterion is met.",
              "Earlier steps reach you only through the repository and `.specs-extraction/`.",
              "Follow the caller's instructions that the Setup section of `plan.md` records in every message and file you write.",
              "Whatever language you write in, keep verbatim the words the workflow matches in `plan.md`: the headings `## Setup`, `## Progress` and `## Gate 1 decisions`, and the label that starts a Progress line: `Gate 1:`, `Decision records written`, a package's name in backticks, `Calibration:`, `Hand-over N:`, or `Gate 2:`. The rest of a line or heading may follow your language.",
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'checkReviewReadOnly', actions: 'clearBossReplyContext' },
          askBoss('reviewPackage', 'extract-specs-18'),
          invalidCaptainOutput('reviewPackage'),
        ],
        onError: captainError,
      },
    },

    checkReviewReadOnly: {
      id: 'checkReviewReadOnly',
      description: 'Check that the review left the repository as it was.',
      meta: {
        playbook: {
          stateId: 'checkReviewReadOnly',
          description: 'Check that the review left the repository as it was.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkReviewReadOnly',
          sourceItem: 'extract-specs-19',
          command: "test -z \"$(git status --porcelain)\" && test \"$(git rev-parse HEAD)\" = \"$(cat .specs-extraction/review-base)\"",
          result: {
            reviewReadOnly: "The command exits zero; continue with the finish.",
            reviewChangedRepository: "The command exits nonzero; extract-specs then ends in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.",
          },
        }),
        onDone: [
          { guard: scriptResult('reviewReadOnly', true), target: 'finishPackage' },
          {
            guard: scriptResult('reviewChangedRepository', false),
            target: 'reviewChangedRepository',
            actions: { type: 'recordTerminal', params: { outcome: 'reviewChangedRepository' } },
          },
          invalidScriptOutput('checkReviewReadOnly'),
        ],
        onError: scriptError,
      },
    },

    finishPackage: {
      id: 'finishPackage',
      description: 'Finish the package: answer every review finding and check the item off.',
      meta: {
        playbook: {
          stateId: 'finishPackage',
          description: 'Finish the package: answer every review finding and check the item off.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'finishPackage',
            sourceItem: 'extract-specs-20',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'checkItemChecked', actions: 'clearBossReplyContext' },
          askBoss('finishPackage', 'extract-specs-20'),
          invalidCaptainOutput('finishPackage'),
        ],
        onError: captainError,
      },
    },

    // ----- Item ------------------------------------------------------------

    doItem: {
      id: 'doItem',
      description: 'Do the current item as SKILL.md states for it.',
      meta: { playbook: { stateId: 'doItem', description: 'Do the current item as SKILL.md states for it.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'captain',
        input: ({ context }): CaptainInput =>
          captainInput(context, {
            stateId: 'doItem',
            sourceItem: 'extract-specs-21',
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
              "End with a short report: what you did, what you committed, and anything the human or the next step needs to know.",
            ].join('\n'),
            result: {
              done: "The acting agent completed the behavior.",
              needsBossReply: "The acting agent's prose surfaces a clarifying question for Boss that the agent cannot answer alone. Output shall include `question: <verbatim question text from the acting agent's prose>`.",
            },
          }),
        onDone: [
          { guard: captainResult('done'), target: 'checkItemChecked', actions: 'clearBossReplyContext' },
          askBoss('doItem', 'extract-specs-21'),
          invalidCaptainOutput('doItem'),
        ],
        onError: captainError,
      },
    },

    // ----- After a step ----------------------------------------------------

    checkItemChecked: {
      id: 'checkItemChecked',
      description: 'Check that the current item is checked off in plan.md.',
      meta: {
        playbook: {
          stateId: 'checkItemChecked',
          description: 'Check that the current item is checked off in plan.md.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkItemChecked',
          sourceItem: 'extract-specs-22',
          command: "! grep -qxF -f .specs-extraction/current-item .specs-extraction/plan.md",
          result: {
            itemChecked: "The command exits zero; continue with the lint check.",
            itemUnchecked: "The command exits nonzero; extract-specs then ends in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.",
          },
        }),
        onDone: [
          { guard: scriptResult('itemChecked', true), target: 'checkLint' },
          {
            guard: scriptResult('itemUnchecked', false),
            target: 'itemUnchecked',
            actions: { type: 'recordTerminal', params: { outcome: 'itemUnchecked' } },
          },
          invalidScriptOutput('checkItemChecked'),
        ],
        onError: scriptError,
      },
    },

    checkLint: {
      id: 'checkLint',
      description: 'Check that spex lint is clean, using the spex version the kit pins.',
      meta: {
        playbook: {
          stateId: 'checkLint',
          description: 'Check that spex lint is clean, using the spex version the kit pins.',
        },
      },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkLint',
          sourceItem: 'extract-specs-23',
          command: "spex=\"$(grep -o '@sublang/spex@[0-9][0-9.]*' .specs-extraction/kit/SKILL.md | head -n 1)\" && test -n \"$spex\" && npx -y \"$spex\" lint",
          result: {
            lintClean: "The command exits zero; continue with the worktree check.",
            lintFailed: "The command exits nonzero; extract-specs then ends in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.",
          },
        }),
        onDone: [
          { guard: scriptResult('lintClean', true), target: 'checkWorktree' },
          {
            guard: scriptResult('lintFailed', false),
            target: 'lintFailed',
            actions: { type: 'recordTerminal', params: { outcome: 'lintFailed' } },
          },
          invalidScriptOutput('checkLint'),
        ],
        onError: scriptError,
      },
    },

    checkWorktree: {
      id: 'checkWorktree',
      description: 'Check that the worktree is clean.',
      meta: { playbook: { stateId: 'checkWorktree', description: 'Check that the worktree is clean.' } },
      tags: ['playbook.busy'],
      invoke: {
        src: 'script',
        input: (): ScriptInput => ({
          stateId: 'checkWorktree',
          sourceItem: 'extract-specs-24',
          command: "test -z \"$(git status --porcelain)\"",
          result: {
            worktreeClean: "The command exits zero; continue with the plan check.",
            worktreeDirty: "The command exits nonzero; extract-specs then ends in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.",
          },
        }),
        onDone: [
          { guard: scriptResult('worktreeClean', true), target: 'checkPlan' },
          {
            guard: scriptResult('worktreeDirty', false),
            target: 'worktreeDirty',
            actions: { type: 'recordTerminal', params: { outcome: 'worktreeDirty' } },
          },
          invalidScriptOutput('checkWorktree'),
        ],
        onError: scriptError,
      },
    },

    // ----- Boss reply, recovery, and terminal states -----------------------

    awaitBossReply: {
      id: 'awaitBossReply',
      description: "Waiting for Boss to answer the acting agent's question.",
      meta: {
        playbook: { stateId: 'awaitBossReply', description: "Waiting for Boss to answer the acting agent's question." },
      },
      tags: ['playbook.parked'],
      on: {
        BOSS_REPLY: [
          ...resumableStates(RESUMABLE_STATE_IDS),
          { target: 'failed', actions: ['clearBossReplyContext', 'rememberInvalidReply'] },
        ],
        BOSS_INTENT: { target: 'refreshKit', actions: 'startRun' },
      },
    },

    failed: {
      id: 'failed',
      description: 'A step failed unexpectedly; lastError holds the cause and a fresh start restarts at the kit refresh.',
      meta: {
        playbook: {
          stateId: 'failed',
          description: 'A step failed unexpectedly; lastError holds the cause and a fresh start restarts at the kit refresh.',
        },
      },
      tags: ['playbook.parked'],
      on: {
        BOSS_INTENT: { target: 'refreshKit', actions: 'startRun' },
      },
    },

    completed: {
      id: 'completed',
      type: 'final',
      description: 'extract-specs completed successfully: every Progress item is checked and the extraction is complete.',
      meta: {
        playbook: {
          stateId: 'completed',
          description:
            'extract-specs completed successfully: every Progress item is checked and the extraction is complete.',
          terminal: 'success',
        },
      },
    },

    gateTwoReported: {
      id: 'gateTwoReported',
      type: 'final',
      description: 'extract-specs completed successfully: the filled Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and it returned to its caller.',
      meta: {
        playbook: {
          stateId: 'gateTwoReported',
          description: 'extract-specs completed successfully: the filled Gate 2 report is in .specs-extraction/gate2-report.md for Boss to read, and it returned to its caller.',
          terminal: 'success',
        },
      },
    },

    kitMissing: {
      id: 'kitMissing',
      type: 'final',
      description: "extract-specs ended in failure: no kit was found in the host's kit directory, or, for auto, where Spex exports the skill, or the kit could not be copied.",
      meta: {
        playbook: {
          stateId: 'kitMissing',
          description: "extract-specs ended in failure: no kit was found in the host's kit directory, or, for auto, where Spex exports the skill, or the kit could not be copied.",
          terminal: 'failure',
        },
      },
    },

    dirtyStart: {
      id: 'dirtyStart',
      type: 'final',
      description:
        'extract-specs ended in failure: the worktree was dirty at the start, and the setup report naming the dirty paths was returned to its caller.',
      meta: {
        playbook: {
          stateId: 'dirtyStart',
          description:
            'extract-specs ended in failure: the worktree was dirty at the start, and the setup report naming the dirty paths was returned to its caller.',
          terminal: 'failure',
        },
      },
    },

    draftUncommitted: {
      id: 'draftUncommitted',
      type: 'final',
      description:
        'extract-specs ended in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.',
      meta: {
        playbook: {
          stateId: 'draftUncommitted',
          description:
            'extract-specs ended in failure: the package draft left uncommitted changes, and the next /extract-specs resumes at the current item.',
          terminal: 'failure',
        },
      },
    },

    reviewChangedRepository: {
      id: 'reviewChangedRepository',
      type: 'final',
      description:
        'extract-specs ended in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.',
      meta: {
        playbook: {
          stateId: 'reviewChangedRepository',
          description:
            'extract-specs ended in failure: the review changed the worktree or the history, which the human inspects before the next /extract-specs resumes at the current item.',
          terminal: 'failure',
        },
      },
    },

    itemUnchecked: {
      id: 'itemUnchecked',
      type: 'final',
      description:
        'extract-specs ended in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.',
      meta: {
        playbook: {
          stateId: 'itemUnchecked',
          description:
            'extract-specs ended in failure: the current item is still unchecked in plan.md, and the next /extract-specs resumes at it.',
          terminal: 'failure',
        },
      },
    },

    lintFailed: {
      id: 'lintFailed',
      type: 'final',
      description:
        'extract-specs ended in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.',
      meta: {
        playbook: {
          stateId: 'lintFailed',
          description:
            'extract-specs ended in failure: spex lint reports problems after the last step, and the next /extract-specs resumes at the first unchecked item.',
          terminal: 'failure',
        },
      },
    },

    worktreeDirty: {
      id: 'worktreeDirty',
      type: 'final',
      description:
        'extract-specs ended in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.',
      meta: {
        playbook: {
          stateId: 'worktreeDirty',
          description:
            'extract-specs ended in failure: the last step left uncommitted changes, and the next /extract-specs resumes at the first unchecked item.',
          terminal: 'failure',
        },
      },
    },
  },
});

