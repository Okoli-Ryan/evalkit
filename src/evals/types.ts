import type { Triage } from '../app/types.js';

/** One boolean check with a human-readable label. */
export interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

/** The judge's verdict on a free-text field. */
export interface JudgeVerdict {
  score: number; // 1-5
  passed: boolean; // score >= threshold
  rationale: string;
}

/** Everything the harness learned about a single ticket. */
export interface CaseResult {
  id: string;
  subject: string;
  triage: Triage;
  gold: { category: string; priority: string; needs_human: boolean };
  /** Layer 1: deterministic assertion checks. */
  assertions: Check[];
  /** Layer 2: exact-match against the gold labels. */
  accuracy: Check[];
  /** Layer 3: LLM-as-judge on the suggested reply. */
  judge: JudgeVerdict;
}

export interface MetricSummary {
  name: string;
  passed: number;
  total: number;
  /** 0-1 */
  rate: number;
}

export interface EvalRun {
  generatedAt: string;
  model: string;
  judgeModel: string;
  cases: CaseResult[];
  metrics: MetricSummary[];
}
