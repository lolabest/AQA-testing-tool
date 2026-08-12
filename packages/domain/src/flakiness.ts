import type { AttemptOutcome } from "./types.js";

export interface AttemptRecord {
  outcome: AttemptOutcome;
  attemptNumber: number;
}

/**
 * Retries must never hide a failure. If any attempt failed and a later
 * attempt passed under the same conditions, the reported outcome is FLAKY.
 */
export function resolveReportedOutcome(
  attempts: readonly AttemptRecord[],
): AttemptOutcome {
  if (attempts.length === 0) {
    return "BLOCKED";
  }

  const ordered = [...attempts].sort(
    (a, b) => a.attemptNumber - b.attemptNumber,
  );
  const last = ordered[ordered.length - 1];
  if (!last) {
    return "BLOCKED";
  }

  const hadFailure = ordered.some((a) => a.outcome === "FAILED");
  if (hadFailure && last.outcome === "PASSED") {
    return "FLAKY";
  }

  return last.outcome;
}

export interface ReliabilitySample {
  passed: number;
  failed: number;
  flaky: number;
}

export function reliabilityScore(sample: ReliabilitySample): {
  score: number;
  sampleSize: number;
} {
  const sampleSize = sample.passed + sample.failed + sample.flaky;
  if (sampleSize === 0) {
    return { score: 1, sampleSize: 0 };
  }
  // Flaky counts as half a failure for rolling reliability.
  const effectivePass = sample.passed + sample.flaky * 0.5;
  return { score: effectivePass / sampleSize, sampleSize };
}

export interface QuarantinePolicy {
  minSampleSize: number;
  maxFailureRate: number;
}

export function shouldQuarantine(
  sample: ReliabilitySample,
  policy: QuarantinePolicy,
): boolean {
  const { score, sampleSize } = reliabilityScore(sample);
  if (sampleSize < policy.minSampleSize) {
    return false;
  }
  const failureRate = 1 - score;
  return failureRate >= policy.maxFailureRate;
}
