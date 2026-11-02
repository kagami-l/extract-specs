// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>
// Linked by slc link (slc/link.md) as a thin shared-factory module.
// FSM: "./extract-specs.fsm.ts"; export: extractSpecsMachine (source-only
// host: Node type stripping, no JavaScript build shipped).
// Link options: none.
// Strategies: deterministic BOSS_INTENT entry (exact text → bossIntent, copied
// into callerInput by startRun); default parked-state Boss-event classifier
// elsewhere; LLM-judge adjudication for every direct-Captain state (no
// allowedTools restriction: transformation-performing Captains); direct-Captain
// composer with labelled quoted relays (shared continuation blocks and
// deterministic JSON renderer); shared script actor with optional `cwd`.
// Artifact schema 3, runtime ABI 1. No delegated-player or nested-playbook
// state, so roleStates and governedPlayerStates are explicitly empty.
import { extractSpecsMachine as machine } from './extract-specs.fsm.ts';
import {
  createXStatePlaybookRuntime,
  defaultComposeCaptainPrompt,
  snapshotJsonValue,
  type PlaybookCaptainInput,
  type XStatePlaybookRuntimeConstruction,
  type XStatePlaybookRuntimeFactory,
  type XStatePlaybookRuntimeSpecV3,
} from '@sublang/playbook/xstate-runtime';
export type {
  PlayerResult,
  PlayerCallOptions,
  PlayerSessionStore,
  CaptainResult,
  CaptainCallOptions,
  JsonValue,
  NormalizedError,
  PlaybookCallRequest,
  PlaybookCallResult,
  PlaybookCallStart,
  PlaybookStateValue,
  PlaybookState,
  PlaybookPendingCall,
  PlaybookRunResult,
  PlaybookRuntime,
  PlaybookRuntimeFactory,
  PlaybookRuntimeSnapshot,
  PlaybookSession,
  PlaybookPorts,
  PlaybookTraceEvent,
  PlaybookTraceType,
  PlaybookControlReceipt,
  PlaybookControlView,
} from '@sublang/playbook/runtime';

/**
 * Configured options for extract-specs.
 *
 * - `kitDir`: the host-supplied `<kit-dir>`, the path of the spec-extraction
 *   kit directory (the FSM's `kitDir` input). The host may supply it; where it
 *   supplies none, `<kit-dir>` defaults to `auto`, which uses the
 *   `extract-specs-pb-kit` skill of this playbook's spec package where Spex
 *   installs it, else where an earlier Spex exported it.
 * - `cwd`: the working directory of the script states.
 *
 * The caller's `<caller-input>` arrives as the entry Boss text, not as an
 * option.
 */
export interface PlaybookRuntimeOptions {
  readonly kitDir?: string;
  readonly cwd?: string;
}
export type PlaybookHostCapabilities = XStatePlaybookRuntimeConstruction<
  PlaybookRuntimeOptions,
  { readonly authority: object }
>['hostCapabilities'];

/** Source-authored `<kit-dir>` default where the host supplies none. */
const DEFAULT_KIT_DIR = 'auto';

const OPTION_SCHEMA: Readonly<Record<string, { readonly type: 'string'; readonly required: boolean }>> = {
  kitDir: { type: 'string', required: false },
  cwd: { type: 'string', required: false },
};

/** Direct-Captain working leaves that may suspend for a Boss reply. */
const RESUMABLE_STATE_IDS: ReadonlySet<string> = new Set([
  'startGate',
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
]);

/** Root final states whose declared terminal kind is `failure`: the procedure stays unfinished. */
const UNFINISHED_FINAL_STATE_IDS: ReadonlySet<string> = new Set([
  'kitMissing',
  'startDeclined',
  'dirtyStart',
  'draftUncommitted',
  'reviewChangedRepository',
  'itemUnchecked',
  'lintFailed',
  'worktreeDirty',
]);

/** No delegated-player result map carries a verbatim-annotated field. */
const VERBATIM_PAYLOAD_FIELDS: ReadonlySet<string> = new Set([]);

/** The canonical kebab-token → camel-field mapping covers every placeholder. */
const PLACEHOLDER_FIELDS: Readonly<Record<string, string>> = {};

const LABEL = 'EXTRACT-SPECS';

/**
 * Validates and JSON-snapshots the configured options. Pure and synchronous:
 * it constructs no runtime and needs no live host capability.
 */
export function validateOptions(value: unknown): PlaybookRuntimeOptions {
  const captured = snapshotJsonValue(value === undefined ? {} : value, `${LABEL} runtime options`);
  if (captured === null || typeof captured !== 'object' || Array.isArray(captured)) {
    throw new TypeError(`${LABEL} runtime options must be an object`);
  }
  const fields = captured as Readonly<Record<string, unknown>>;
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
  if (Object.hasOwn(fields, 'kitDir')) return captured as unknown as PlaybookRuntimeOptions;
  return snapshotJsonValue(
    { ...fields, kitDir: DEFAULT_KIT_DIR },
    `${LABEL} runtime options`,
  ) as unknown as PlaybookRuntimeOptions;
}

const PLACEHOLDER_TOKEN = /<(#|[A-Za-z_$][A-Za-z0-9_$-]*)>/g;
const BARE_RELAY_LINE = /^> <(#|[A-Za-z_$][A-Za-z0-9_$-]*)>$/;

function placeholderField(token: string): string {
  if (Object.hasOwn(PLACEHOLDER_FIELDS, token)) return PLACEHOLDER_FIELDS[token]!;
  if (token === '#') return 'irNumber';
  return token.replace(/-([A-Za-z0-9_$])/g, (_match: string, next: string) => next.toUpperCase());
}

/**
 * Renders one token: strings verbatim; JSON-safe arrays and objects through
 * the shared deterministic renderer; anything else keeps the source token.
 */
function renderPlaceholder(input: PlaybookCaptainInput, match: string, token: string): string | undefined {
  const value = (input as unknown as Readonly<Record<string, unknown>>)[placeholderField(token)];
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return undefined;
  const { pendingBossQuestion: _question, bossReply: _reply, ...rest } = input;
  return defaultComposeCaptainPrompt({ ...rest, prompt: match }, PLACEHOLDER_FIELDS);
}

/** Keeps the `> ` marker on every continuation line of a value inserted into a quoted line. */
function quoteContinuation(value: string): string {
  return value.replace(/\r?\n/g, (ending: string) => `${ending}> `);
}

/**
 * Direct-Captain composer (slc/link.md §Captain prompt composition, §Output):
 * one callback pass over the unchanged GEARS body. A value inserted into a
 * quoted line (such as `> Caller input: <caller-input>`) keeps the `>` marker
 * on every continuation line with LF/CRLF separators preserved; a bare
 * `> <token>` line whose value is empty is omitted; inserted text is literal
 * and never substituted again. When the input carries a pending Boss question
 * and reply, the shared continuation blocks precede the body exactly as the
 * shared default composer renders them; the runtime itself supplies that
 * continuation and hands this composer the input without it.
 */
function composeCaptainPrompt(input: PlaybookCaptainInput): string {
  const fields = input as unknown as Readonly<Record<string, unknown>>;
  const parts = input.prompt.split(/(\r?\n)/);
  // The shared composer over an empty body yields only the continuation
  // prefix (or nothing); the original input stays unchanged.
  let body = defaultComposeCaptainPrompt({ ...input, prompt: '' }, PLACEHOLDER_FIELDS);
  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index]!;
    const ending = parts[index + 1] ?? '';
    const bare = BARE_RELAY_LINE.exec(line);
    if (bare !== null && fields[placeholderField(bare[1]!)] === '') {
      if (ending === '') body = body.replace(/\r?\n$/, '');
      continue;
    }
    const quoted = line.startsWith('>');
    body +=
      line.replace(PLACEHOLDER_TOKEN, (match: string, token: string): string => {
        const value = renderPlaceholder(input, match, token);
        if (value === undefined) return match;
        return quoted ? quoteContinuation(value) : value;
      }) + ending;
  }
  return body;
}

const runtimeSpec = {
  label: LABEL,
  compat: { artifactSchema: 3, runtimeAbi: 1 },
  snapshotOptions: validateOptions,
  machineInput: (options: PlaybookRuntimeOptions) => ({ kitDir: options.kitDir ?? DEFAULT_KIT_DIR }),
  entryEvent: { type: 'BOSS_INTENT', textField: 'bossIntent', contextField: 'callerInput' },
  bossEvents: [],
  roleStates: {},
  outcomeAuthority: { governedPlayerStates: {} },
  placeholderFields: PLACEHOLDER_FIELDS,
  composeCaptainPrompt,
  transitionEventFields: ['bossIntent', 'answer', 'questionId', 'targetId'],
  verbatimPayloadFields: VERBATIM_PAYLOAD_FIELDS,
  resumableStateIds: RESUMABLE_STATE_IDS,
  unfinishedFinalStateIds: UNFINISHED_FINAL_STATE_IDS,
  controlContextFields: ['callerInput'],
} satisfies XStatePlaybookRuntimeSpecV3<PlaybookRuntimeOptions>;

export const _internal = {
  composeCaptainPrompt,
  RESUMABLE_STATE_IDS,
  UNFINISHED_FINAL_STATE_IDS,
  VERBATIM_PAYLOAD_FIELDS,
};

const createPlaybookRuntime: XStatePlaybookRuntimeFactory<
  XStatePlaybookRuntimeConstruction<PlaybookRuntimeOptions, PlaybookHostCapabilities>,
  3
> = createXStatePlaybookRuntime<PlaybookRuntimeOptions, PlaybookHostCapabilities>(machine, runtimeSpec);
export default createPlaybookRuntime;
