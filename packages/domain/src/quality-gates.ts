export interface QualityGateRule {
  id: string;
  type:
    | "NO_FAILED_CRITICAL"
    | "MIN_WEIGHTED_COVERAGE"
    | "MAX_FLAKY_PERCENT"
    | "MAX_UNRESOLVED_CRITICAL_REGRESSIONS"
    | "MAX_DURATION_MS"
    | "REQUIRED_BROWSERS";
  threshold?: number;
  browsers?: string[];
}

export interface QualityGateEvaluationInput {
  failedCriticalCount: number;
  weightedCoverage: number;
  flakyPercent: number;
  unresolvedCriticalRegressions: number;
  durationMs: number;
  browsersExecuted: string[];
  rules: QualityGateRule[];
}

export interface QualityGateRuleResult {
  rule: QualityGateRule;
  passed: boolean;
  actual: number | string;
  threshold: number | string | null;
}

export interface QualityGateResult {
  passed: boolean;
  results: QualityGateRuleResult[];
}

export function evaluateQualityGates(
  input: QualityGateEvaluationInput,
): QualityGateResult {
  const results: QualityGateRuleResult[] = input.rules.map((rule) => {
    switch (rule.type) {
      case "NO_FAILED_CRITICAL": {
        const passed = input.failedCriticalCount === 0;
        return {
          rule,
          passed,
          actual: input.failedCriticalCount,
          threshold: 0,
        };
      }
      case "MIN_WEIGHTED_COVERAGE": {
        const threshold = rule.threshold ?? 0.8;
        return {
          rule,
          passed: input.weightedCoverage >= threshold,
          actual: input.weightedCoverage,
          threshold,
        };
      }
      case "MAX_FLAKY_PERCENT": {
        const threshold = rule.threshold ?? 0.1;
        return {
          rule,
          passed: input.flakyPercent <= threshold,
          actual: input.flakyPercent,
          threshold,
        };
      }
      case "MAX_UNRESOLVED_CRITICAL_REGRESSIONS": {
        const threshold = rule.threshold ?? 0;
        return {
          rule,
          passed: input.unresolvedCriticalRegressions <= threshold,
          actual: input.unresolvedCriticalRegressions,
          threshold,
        };
      }
      case "MAX_DURATION_MS": {
        const threshold = rule.threshold ?? Number.POSITIVE_INFINITY;
        return {
          rule,
          passed: input.durationMs <= threshold,
          actual: input.durationMs,
          threshold,
        };
      }
      case "REQUIRED_BROWSERS": {
        const required = rule.browsers ?? [];
        const missing = required.filter(
          (b) => !input.browsersExecuted.includes(b),
        );
        return {
          rule,
          passed: missing.length === 0,
          actual: input.browsersExecuted.join(","),
          threshold: required.join(","),
        };
      }
      default: {
        const _exhaustive: never = rule.type;
        throw new Error(`Unknown rule type: ${_exhaustive}`);
      }
    }
  });

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}
