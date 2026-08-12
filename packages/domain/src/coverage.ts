import type { CoverageStatus, RiskLevel } from "./types.js";

export interface RequirementCoverageInput {
  criticality: RiskLevel;
  linkedTestCount: number;
  passingTestCount: number;
  failingTestCount: number;
  blockedTestCount: number;
  executedTestCount: number;
  coverageStrength: number; // 0..1 how thoroughly scenarios cover the requirement
}

const CRITICALITY_WEIGHT: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 8,
};

export function classifyCoverage(
  input: RequirementCoverageInput,
): CoverageStatus {
  if (input.linkedTestCount === 0) {
    return "NOT_COVERED";
  }
  if (input.blockedTestCount > 0 && input.executedTestCount === 0) {
    return "BLOCKED";
  }
  if (input.executedTestCount === 0) {
    return "COVERED_NOT_EXECUTED";
  }
  if (input.failingTestCount > 0) {
    return "COVERED_FAILING";
  }
  if (input.coverageStrength < 0.6 || input.passingTestCount < input.linkedTestCount) {
    return "PARTIALLY_COVERED";
  }
  if (input.passingTestCount > 0) {
    return "COVERED_PASSING";
  }
  return "PARTIALLY_COVERED";
}

export function weightedCoverageScore(
  items: readonly RequirementCoverageInput[],
): number {
  if (items.length === 0) {
    return 0;
  }
  let weightedSum = 0;
  let weightTotal = 0;
  for (const item of items) {
    const weight = CRITICALITY_WEIGHT[item.criticality];
    weightTotal += weight;
    const status = classifyCoverage(item);
    const statusScore =
      status === "COVERED_PASSING"
        ? 1
        : status === "PARTIALLY_COVERED"
          ? 0.5
          : status === "COVERED_NOT_EXECUTED"
            ? 0.35
            : status === "COVERED_FAILING"
              ? 0.25
              : status === "BLOCKED"
                ? 0.1
                : 0;
    weightedSum += weight * statusScore * Math.min(1, Math.max(0, item.coverageStrength));
  }
  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}
