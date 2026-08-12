import { describe, expect, it } from "vitest";
import {
  assertPermission,
  hasPermission,
  AuthorizationError,
} from "./rbac.js";
import {
  canTransitionTestCase,
  isExecutableInProtectedEnvironment,
  statusAfterMaterialChange,
  transitionTestCase,
} from "./test-case-lifecycle.js";
import {
  canTransitionTestRun,
  isTerminalRunStatus,
  transitionTestRun,
} from "./test-run-lifecycle.js";
import { resolveReportedOutcome, shouldQuarantine } from "./flakiness.js";
import { classifyCoverage, weightedCoverageScore } from "./coverage.js";
import { scoreTestProposal } from "./scoring.js";
import { canAutoApplyHealing } from "./healing.js";
import { evaluateQualityGates } from "./quality-gates.js";

describe("rbac", () => {
  it("grants owner all permissions", () => {
    expect(hasPermission("OWNER", "secrets:manage")).toBe(true);
  });

  it("denies viewer execute", () => {
    expect(hasPermission("VIEWER", "test:execute")).toBe(false);
    expect(() => assertPermission("VIEWER", "test:execute")).toThrow(
      AuthorizationError,
    );
  });
});

describe("test case lifecycle", () => {
  it("allows generated -> validated -> approved -> active", () => {
    expect(transitionTestCase("GENERATED", "VALIDATED")).toBe("VALIDATED");
    expect(transitionTestCase("VALIDATED", "APPROVED")).toBe("APPROVED");
    expect(transitionTestCase("APPROVED", "ACTIVE")).toBe("ACTIVE");
  });

  it("blocks archived transitions", () => {
    expect(canTransitionTestCase("ARCHIVED", "ACTIVE")).toBe(false);
  });

  it("returns to validated after material change", () => {
    expect(statusAfterMaterialChange("ACTIVE")).toBe("VALIDATED");
  });

  it("blocks unapproved execution in protected envs", () => {
    expect(isExecutableInProtectedEnvironment("GENERATED")).toBe(false);
    expect(isExecutableInProtectedEnvironment("APPROVED")).toBe(true);
  });
});

describe("test run lifecycle", () => {
  it("follows happy path", () => {
    let s = transitionTestRun("QUEUED", "PREPARING");
    s = transitionTestRun(s, "RUNNING");
    s = transitionTestRun(s, "COLLECTING_ARTIFACTS");
    s = transitionTestRun(s, "TRIAGING");
    s = transitionTestRun(s, "COMPLETED");
    expect(isTerminalRunStatus(s)).toBe(true);
  });

  it("rejects reactivation of terminal runs", () => {
    expect(canTransitionTestRun("COMPLETED", "RUNNING")).toBe(false);
  });
});

describe("flakiness", () => {
  it("reports flaky when fail then pass", () => {
    expect(
      resolveReportedOutcome([
        { attemptNumber: 1, outcome: "FAILED" },
        { attemptNumber: 2, outcome: "PASSED" },
      ]),
    ).toBe("FLAKY");
  });

  it("does not quarantine below sample size", () => {
    expect(
      shouldQuarantine(
        { passed: 1, failed: 1, flaky: 0 },
        { minSampleSize: 10, maxFailureRate: 0.3 },
      ),
    ).toBe(false);
  });
});

describe("coverage", () => {
  it("classifies uncovered requirements", () => {
    expect(
      classifyCoverage({
        criticality: "HIGH",
        linkedTestCount: 0,
        passingTestCount: 0,
        failingTestCount: 0,
        blockedTestCount: 0,
        executedTestCount: 0,
        coverageStrength: 0,
      }),
    ).toBe("NOT_COVERED");
  });

  it("weights coverage by criticality", () => {
    const score = weightedCoverageScore([
      {
        criticality: "CRITICAL",
        linkedTestCount: 1,
        passingTestCount: 1,
        failingTestCount: 0,
        blockedTestCount: 0,
        executedTestCount: 1,
        coverageStrength: 1,
      },
      {
        criticality: "LOW",
        linkedTestCount: 0,
        passingTestCount: 0,
        failingTestCount: 0,
        blockedTestCount: 0,
        executedTestCount: 0,
        coverageStrength: 0,
      },
    ]);
    expect(score).toBeGreaterThan(0.8);
  });
});

describe("scoring", () => {
  it("returns explainable score components", () => {
    const result = scoreTestProposal({
      businessImpact: 1,
      failureLikelihood: 0.5,
      changeExposure: 0.5,
      historicalInstability: 0.2,
      securityCompliance: 0.8,
      executionCost: 0.1,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.explainability.businessImpact).toContain("Business impact");
  });
});

describe("healing", () => {
  it("requires human approval", () => {
    expect(
      canAutoApplyHealing({
        humanApproved: false,
        confidence: 0.99,
        kind: "LOCATOR_REPLACEMENT",
        validation: {
          unique: true,
          visible: true,
          actionable: true,
          semanticallyEquivalent: true,
          replaySucceeded: true,
        },
      }),
    ).toBe(false);
  });
});

describe("quality gates", () => {
  it("evaluates deterministic rules", () => {
    const result = evaluateQualityGates({
      failedCriticalCount: 0,
      weightedCoverage: 0.9,
      flakyPercent: 0.05,
      unresolvedCriticalRegressions: 0,
      durationMs: 1000,
      browsersExecuted: ["chromium"],
      rules: [
        { id: "1", type: "NO_FAILED_CRITICAL" },
        { id: "2", type: "MIN_WEIGHTED_COVERAGE", threshold: 0.8 },
        { id: "3", type: "REQUIRED_BROWSERS", browsers: ["chromium"] },
      ],
    });
    expect(result.passed).toBe(true);
  });
});
