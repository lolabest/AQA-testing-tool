export type HealingChangeKind =
  | "LOCATOR_REPLACEMENT"
  | "ROUTE_UPDATE"
  | "UI_MAP_ADJUSTMENT";

export interface HealingValidation {
  unique: boolean;
  visible: boolean;
  actionable: boolean;
  semanticallyEquivalent: boolean;
  replaySucceeded: boolean;
}

export const FORBIDDEN_HEALING_TARGETS = [
  "expectedBusinessValue",
  "assertion",
  "price",
  "permission",
  "validationRule",
  "securityCheck",
  "testDataMeaning",
  "navigationScenario",
  "destructiveBehavior",
  "assertionWeakening",
  "fixedWait",
  "retryIncrease",
] as const;

export type ForbiddenHealingTarget = (typeof FORBIDDEN_HEALING_TARGETS)[number];

export function isAllowedHealingKind(kind: HealingChangeKind): boolean {
  return (
    kind === "LOCATOR_REPLACEMENT" ||
    kind === "ROUTE_UPDATE" ||
    kind === "UI_MAP_ADJUSTMENT"
  );
}

export function canAutoApplyHealing(options: {
  humanApproved: boolean;
  confidence: number;
  validation: HealingValidation;
  kind: HealingChangeKind;
}): boolean {
  if (!options.humanApproved) {
    return false;
  }
  if (!isAllowedHealingKind(options.kind)) {
    return false;
  }
  const v = options.validation;
  return (
    v.unique &&
    v.visible &&
    v.actionable &&
    v.semanticallyEquivalent &&
    v.replaySucceeded &&
    options.confidence >= 0.7
  );
}
