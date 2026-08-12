import type { RiskLevel } from "./types.js";

export interface TestScoreComponents {
  businessImpact: number;
  failureLikelihood: number;
  changeExposure: number;
  historicalInstability: number;
  securityCompliance: number;
  executionCost: number;
}

export interface ScoredTestProposal {
  score: number;
  components: TestScoreComponents;
  explainability: Record<keyof TestScoreComponents, string>;
}

const WEIGHTS: TestScoreComponents = {
  businessImpact: 0.3,
  failureLikelihood: 0.2,
  changeExposure: 0.15,
  historicalInstability: 0.15,
  securityCompliance: 0.15,
  executionCost: -0.05,
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreTestProposal(
  components: TestScoreComponents,
): ScoredTestProposal {
  const normalized: TestScoreComponents = {
    businessImpact: clamp01(components.businessImpact),
    failureLikelihood: clamp01(components.failureLikelihood),
    changeExposure: clamp01(components.changeExposure),
    historicalInstability: clamp01(components.historicalInstability),
    securityCompliance: clamp01(components.securityCompliance),
    executionCost: clamp01(components.executionCost),
  };

  const score =
    normalized.businessImpact * WEIGHTS.businessImpact +
    normalized.failureLikelihood * WEIGHTS.failureLikelihood +
    normalized.changeExposure * WEIGHTS.changeExposure +
    normalized.historicalInstability * WEIGHTS.historicalInstability +
    normalized.securityCompliance * WEIGHTS.securityCompliance +
    normalized.executionCost * WEIGHTS.executionCost;

  return {
    score: Math.round(score * 1000) / 1000,
    components: normalized,
    explainability: {
      businessImpact: `Business impact ${normalized.businessImpact} × ${WEIGHTS.businessImpact}`,
      failureLikelihood: `Failure likelihood ${normalized.failureLikelihood} × ${WEIGHTS.failureLikelihood}`,
      changeExposure: `Change exposure ${normalized.changeExposure} × ${WEIGHTS.changeExposure}`,
      historicalInstability: `Historical instability ${normalized.historicalInstability} × ${WEIGHTS.historicalInstability}`,
      securityCompliance: `Security/compliance ${normalized.securityCompliance} × ${WEIGHTS.securityCompliance}`,
      executionCost: `Execution cost penalty ${normalized.executionCost} × ${WEIGHTS.executionCost}`,
    },
  };
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.55) return "HIGH";
  if (score >= 0.35) return "MEDIUM";
  return "LOW";
}
