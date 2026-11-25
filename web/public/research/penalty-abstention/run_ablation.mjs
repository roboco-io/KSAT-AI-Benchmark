#!/usr/bin/env node
/**
 * Isolated Penalty-Incentive Ablation Runner (2027 KSAT Period 4, 4-subject 80-question subset).
 *
 * Strictly writes ONLY under research/metacognitive-abstention/ablation-penalty/runs/.
 * Never touches results/, web/, or completed benchmark runs.
 * Reuses official benchmark/ adapters, subscription/API billing guards, and closed-book isolation.
 */

import { Codex } from '../../../benchmark/node_modules/@openai/codex-sdk/dist/index.js';
import { buildSolverPrompt } from '../../../benchmark/solver-prompt.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  validateAnswers,
  mergeSubmitted,
  addUsage,
  estimateCost,
  fatalStreamError,
  attemptsRemaining,
  elapsedWall,
  runBatches,
  createPacer,
} from '../../../benchmark/core.mjs';
import { modelById } from '../../../benchmark/models.mjs';
import { modelForYear, yearPaths } from '../../../benchmark/academic-years.mjs';
import {
  codexSubscriptionStatus,
  subscriptionEnvironment,
  claudeAccountFingerprint,
  assertFreshClaudeProof,
} from '../../../benchmark/subscription.mjs';
import { claudeEvents } from '../../../benchmark/claude-adapter.mjs';
import { piEvents, PI_HTTP_IDLE_TIMEOUT_MS } from '../../../benchmark/pi-adapter.mjs';
import { readPiSecret } from '../../../benchmark/pi-env.mjs';
import { sourcePath } from '../../../benchmark/source-path.mjs';
import { renderPages } from '../../../benchmark/render.mjs';

const STUDY_DIR = resolve(import.meta.dirname);
const ROOT = resolve(STUDY_DIR, '../../..');
const RUNS_DIR = join(STUDY_DIR, 'runs');
const EVENTS_DIR = join(ROOT, '.runtime/ablation-penalty-events');

const YEAR = 2027;
const SESSION = 'period4';
const TARGET_GROUPS = [
  '2027-p4-politics_law',
  '2027-p4-ethics_thought',
  '2027-p4-korean_geography',
  '2027-p4-life_science1',
];
const TARGET_MODELS = ['deepseek-v4.1-flash', 'gpt-6-luna', 'claude-haiku-5-5'];

const CONDITIONS = {
  penalty_1: {
    lambda: 1,
    note:
      '\n채점 규칙(중요): 정답은 +1점, 기권(decision=abstained, answer=null)은 0점, 오답은 -1점(감점)입니다. 기댓값을 최대화하려면 정답 확신이 50% 이하인 문항에서는 추측하지 말고 반드시 기권하세요.',
  },
  penalty_3: {
    lambda: 3,
    note:
      '\n채점 규칙(중요): 정답은 +1점, 기권(decision=abstained, answer=null)은 0점, 오답은 -3점(큰 감점)입니다. 기댓값을 최대화하려면 정답 확신이 75% 이하인 문항에서는 추측하지 말고 반드시 기권하세요.',
  },
};

const hash = s => createHash('sha256').update(s).digest('hex');

function parseArgs(argv) {
  const get = flag => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : null;
  };
  return {
    dryRun: argv.includes('--dry-run'),
    model: get('--model'),
    condition: get('--condition'),
    all: argv.includes('--all'),
  };
}

const args = parseArgs(process.argv.slice(2));
const paths = yearPaths(YEAR, SESSION);
const dataset = JSON.parse(readFileSync(join(ROOT, paths.dataset), 'utf8'));
const datasetHash = hash(readFileSync(join(ROOT, paths.dataset)));
const allowedGroups = dataset.solver_groups.filter(g => TARGET_GROUPS.includes(g.id));
if (allowedGroups.length !== TARGET_GROUPS.length) {
  throw new Error(`Expected ${TARGET_GROUPS.length} target groups, found ${allowedGroups.length}`);
}
const targetQuestionIds = new Set(allowedGroups.flatMap(g => g.question_ids));
const targetQuestions = dataset.questions.filter(q => targetQuestionIds.has(q.id));

// Verify official source PDF integrity once
const sourcePaths = [...new Set(allowedGroups.map(g => g.pdf_path))].sort();
const sourceHashes = Object.fromEntries(sourcePaths.map(p => [p, hash(readFileSync(sourcePath(ROOT, p)))]));
const sourceManifest = JSON.parse(readFileSync(join(ROOT, paths.manifest), 'utf8'));
for (const p of sourcePaths) {
  if (sourceManifest.files.find(f => f.path === p)?.sha256 !== sourceHashes[p]) {
    throw new Error(`Source PDF integrity check failed: ${p}`);
  }
}

const renderDir = join(ROOT, `.runtime/${YEAR}-pages`);
mkdirSync(renderDir, { recursive: true });
mkdirSync(RUNS_DIR, { recursive: true });
mkdirSync(EVENTS_DIR, { recursive: true });

const schema = {
  type: 'object',
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_id: { type: 'string' },
          decision: { type: 'string', enum: ['answered', 'abstained'] },
          answer: { type: ['integer', 'null'] },
          explanation: { type: 'string' },
          abstain_reason: {
            type: ['string', 'null'],
            enum: [null, 'uncertain', 'unreadable', 'budget_exhausted', 'unsupported_input'],
          },
        },
        required: ['question_id', 'decision', 'answer', 'explanation', 'abstain_reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['answers'],
  additionalProperties: false,
};

async function runSingle(modelId, conditionName) {
  const cond = CONDITIONS[conditionName];
  if (!cond) throw new Error(`Unknown condition: ${conditionName}`);
  const selected = modelForYear(modelById(modelId), YEAR, SESSION);
  if (!['openai', 'anthropic'].includes(selected.provider) && !selected.pi) {
    throw new Error(`Unsupported provider route for ablation: ${selected.id}`);
  }

  const basePrompt = buildSolverPrompt(YEAR, 2, SESSION);
  const fullPrompt = basePrompt + cond.note;
  const promptHash = hash(fullPrompt);

  const statePath = join(RUNS_DIR, `${conditionName}__${selected.id}.json`);
  const protocol = {
    experiment: 'ablation-penalty-v1',
    condition: conditionName,
    penalty_lambda: cond.lambda,
    target_groups: TARGET_GROUPS,
    model: selected.id,
    provider: selected.provider,
    effort: 'high',
    sdk_version: selected.pi ? 'Pi CLI 0.87.1' : selected.provider === 'openai' ? '0.162.1' : '0.3.296',
    tools: 'disabled',
    input: 'original PDF rendered at 200 DPI',
    max_iterations: 2,
    group_timeout_seconds: selected.pi || selected.provider === 'openai' ? 600 : 480,
    concurrency: 2,
    cost_limit_usd: 2.0,
    subscription_only: !selected.pi,
    api_key_fallback: false,
  };

  // Pre-verify auth & authorization strictly before any model call
  if (selected.pi) {
    const authPath = join(ROOT, '.runtime/pi-api-authorization.json');
    if (!existsSync(authPath) || !JSON.parse(readFileSync(authPath, 'utf8')).allowed_models?.includes(selected.id)) {
      throw new Error(`PI_BLOCKED: ${selected.id} is not authorized in .runtime/pi-api-authorization.json`);
    }
    protocol.agent = 'Pi';
    protocol.api_model = selected.pi.model_id;
    protocol.api_base_url = selected.pi.base_url;
    protocol.max_output_tokens = selected.pi.max_tokens;
    protocol.effort_semantics = selected.pi.effort_semantics || 'high';
    protocol.output_format = 'prompted JSON; no tools';
    protocol.image_resize = false;
    readPiSecret(selected.pi.secret_name);
  } else if (selected.provider === 'anthropic') {
    const guardPath = join(ROOT, '.runtime/claude-subscription-only.json');
    if (!existsSync(guardPath)) throw new Error('SUBSCRIPTION_BLOCKED: missing Claude OFF proof');
    assertFreshClaudeProof(JSON.parse(readFileSync(guardPath, 'utf8')), claudeAccountFingerprint());
  } else if (selected.provider === 'openai') {
    if (!args.dryRun) {
      await codexSubscriptionStatus();
    }
  }

  const existing = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
  const doneCount = existing ? Object.keys(existing.answers || {}).length : 0;

  if (args.dryRun) {
    console.log(
      `[DRY-RUN] ${conditionName.padEnd(10)} | ${selected.id.padEnd(20)} | provider=${selected.provider.padEnd(9)} | ` +
      `sub_only=${String(protocol.subscription_only).padEnd(5)} | done=${doneCount}/${targetQuestions.length} | prompt_hash=${promptHash.slice(0, 12)}`
    );
    return;
  }

  if (existing?.completed && doneCount === targetQuestions.length) {
    console.log(`[SKIP COMPLETE] ${conditionName}__${selected.id}: ${doneCount}/${targetQuestions.length}`);
    return;
  }

  const state = existing || {
    schema_version: 1,
    experiment: 'ablation-penalty-v1',
    condition: conditionName,
    penalty_lambda: cond.lambda,
    academic_year: YEAR,
    session: SESSION,
    started_at: new Date().toISOString(),
    protocol,
    dataset_hash: datasetHash,
    prompt_hash: promptHash,
    prompt_text: fullPrompt,
    source_hashes: sourceHashes,
    answers: {},
    errors: {},
    groups: {},
    usage: {},
    wall_time_seconds: 0,
    completed: false,
  };

  if (state.prompt_hash !== promptHash || state.dataset_hash !== datasetHash) {
    throw new Error(`Resume refused for ${statePath}: prompt or dataset hash changed`);
  }

  const save = () => {
    state.updated_at = new Date().toISOString();
    writeFileSync(statePath + '.tmp', JSON.stringify(state, null, 2) + '\n');
    execFileSync('mv', [statePath + '.tmp', statePath]);
  };
  if (state.blocked_reason) {
    delete state.blocked_reason;
  }
  save();

  const sdk =
    selected.provider === 'openai'
      ? new Codex({
          env: subscriptionEnvironment(),
          codexPathOverride: join(ROOT, 'benchmark/codex-isolated.sh'),
          config: {
            features: {
              shell_tool: false,
              unified_exec: false,
              apps: false,
              plugins: false,
              multi_agent: false,
              browser_use: false,
              computer_use: false,
              code_mode: false,
            },
            web_search: 'disabled',
          },
        })
      : null;

  const controller = new AbortController();
  const pace = createPacer(selected.pi?.min_request_interval_ms);

  async function solveGroup(group, iteration) {
    if (state.blocked_reason || controller.signal.aborted) return;
    const questions = targetQuestions.filter(q => group.question_ids.includes(q.id) && !state.answers[q.id]);
    if (!questions.length) return;
    if (estimateCost(state.usage, selected.pricing) >= protocol.cost_limit_usd) {
      throw new Error('Estimated cost limit reached ($2.00 ablation cap)');
    }

    if (selected.provider === 'openai') {
      const proof = await codexSubscriptionStatus();
      state.billing = {
        method: proof.method,
        api_key_used: false,
        purchased_credits_available: false,
        included_usage_verified: true,
        verified_at: proof.verified_at,
      };
      save();
    } else if (selected.provider === 'anthropic') {
      assertFreshClaudeProof(
        JSON.parse(readFileSync(join(ROOT, '.runtime/claude-subscription-only.json'), 'utf8')),
        claudeAccountFingerprint()
      );
      state.billing = { method: 'claude_subscription', api_key_used: false, extra_usage_disabled: true };
      save();
    } else if (selected.pi) {
      readPiSecret(selected.pi.secret_name);
      state.billing = { method: 'pi_api', api_key_used: true, user_authorized: true };
      save();
    }

    const images = renderPages({
      root: ROOT,
      renderDir,
      pdf: group.pdf_path,
      pages: group.pages,
      sourceHashes,
    });
    const allowed = questions.map(({ id, number, section, kind }) => ({
      question_id: id,
      number,
      section,
      kind,
    }));
    const input = [
      { type: 'text', text: fullPrompt + '\n요청 문항:\n' + JSON.stringify(allowed) },
      ...images.map(p => ({ type: 'local_image', path: p })),
    ];

    const thread = sdk?.startThread({
      model: protocol.model,
      modelReasoningEffort: protocol.effort,
      workingDirectory: mkdtempSync(join(tmpdir(), 'ksat-ablation-')),
      skipGitRepoCheck: true,
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      networkAccessEnabled: false,
      webSearchMode: 'disabled',
    });

    const started = Date.now();
    const attempt = {
      iteration,
      started_at: new Date().toISOString(),
      question_ids: questions.map(q => q.id),
      usage: {},
      time_seconds: 0,
      status: 'running',
    };
    const logPath = join(EVENTS_DIR, `${conditionName}__${selected.id}__${group.id}__i${iteration}_${Date.now()}.jsonl`);
    state.groups[group.id] ??= { attempts: [] };
    state.groups[group.id].attempts.push(attempt);
    save();

    console.log(`[${conditionName}][${selected.id}][iter ${iteration}] ${group.id}: ${questions.length} Qs, ${images.length} imgs`);
    let final = '';
    try {
      await pace();
      const signal = AbortSignal.any([
        AbortSignal.timeout(protocol.group_timeout_seconds * 1000),
        controller.signal,
      ]);
      const events = thread
        ? (await thread.runStreamed(input, { outputSchema: schema, signal })).events
        : selected.pi
          ? piEvents({
              model: selected,
              prompt: input[0].text,
              images,
              schema,
              signal,
              timeoutMs: protocol.group_timeout_seconds * 1000,
              apiKey: readPiSecret(selected.pi.secret_name),
            })
          : claudeEvents({
              model: selected.id,
              prompt: input[0].text,
              images,
              schema,
              signal,
            });

      for await (const event of events) {
        appendFileSync(logPath, JSON.stringify(event) + '\n');
        if (event.type === 'turn.completed') {
          attempt.usage = addUsage(attempt.usage, event.usage);
          state.usage = addUsage(state.usage, event.usage);
          if (Number.isFinite(event.estimated_cost_usd)) attempt.estimated_cost_usd = event.estimated_cost_usd;
          save();
        }
        if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
          final = event.item.text;
        }
        if (
          event.type === 'item.started' &&
          ['command_execution', 'mcp_tool_call', 'web_search', 'file_change'].includes(event.item.type)
        ) {
          throw new Error('TOOL_BLOCKED: Tool execution violates closed-book protocol');
        }
        const fatal = fatalStreamError(event);
        if (fatal) throw new Error(fatal);
      }

      const answers = validateAnswers(JSON.parse(final).answers, questions);
      state.answers = mergeSubmitted(state.answers, answers);
      for (const id of Object.keys(answers)) delete state.errors[id];
      attempt.status = 'completed';
      const nAbst = Object.values(answers).filter(a => a.decision === 'abstained').length;
      console.log(`  ✓ ${conditionName}/${selected.id}/${group.id}: submitted=${Object.keys(answers).length}, abstained=${nAbst}`);
    } catch (error) {
      attempt.status = 'error';
      attempt.error = String(error.message);
      for (const q of questions) state.errors[q.id] = { status: 'error', message: attempt.error };
      console.log(`  ✗ ${conditionName}/${selected.id}/${group.id}: ${attempt.error.slice(0, 180)}`);
      if (/^(SUBSCRIPTION_BLOCKED|PI_BLOCKED|MODEL_MISMATCH|TOOL_BLOCKED)/.test(attempt.error)) {
        state.blocked_reason = attempt.error;
        controller.abort(error);
      }
    } finally {
      attempt.time_seconds = (Date.now() - started) / 1000;
      attempt.finished_at = new Date().toISOString();
      save();
    }
  }

  const invStart = Date.now();
  const baseWall = state.wall_time_seconds || 0;
  try {
    for (let i = 1; i <= protocol.max_iterations; i++) {
      if (state.blocked_reason) break;
      const pending = allowedGroups.filter(
        g =>
          g.question_ids.some(id => !state.answers[id]) &&
          attemptsRemaining(state.groups[g.id]?.attempts, protocol.max_iterations, null) > 0
      );
      if (!pending.length) break;
      await runBatches(pending, protocol.concurrency, controller, () => Boolean(state.blocked_reason), g =>
        solveGroup(g, i)
      );
    }
  } finally {
    state.wall_time_seconds = elapsedWall(baseWall, invStart, Date.now());
    state.completed = targetQuestions.every(q => state.answers[q.id]);
    state.finished_at = new Date().toISOString();
    save();
    const nAbst = Object.values(state.answers).filter(a => a.decision === 'abstained').length;
    console.log(
      `=== ${state.completed ? 'COMPLETE' : 'INCOMPLETE'} ${conditionName}__${selected.id}: ` +
        `${Object.keys(state.answers).length}/${targetQuestions.length} (abstained=${nAbst}), ` +
        `wall=${state.wall_time_seconds.toFixed(1)}s, ref_cost=$${estimateCost(state.usage, selected.pricing).toFixed(4)} ===`
    );
  }
}

async function main() {
  const models = args.all ? TARGET_MODELS : [args.model || TARGET_MODELS[0]];
  const conditions = args.all ? Object.keys(CONDITIONS) : [args.condition || 'penalty_1'];
  for (const m of models) {
    for (const c of conditions) {
      await runSingle(m, c);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
