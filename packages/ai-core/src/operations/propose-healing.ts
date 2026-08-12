import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const proposeHealingInputSchema = z.object({
  testIntent: z.string().min(1),
  failure: z.string().min(1),
  pageSnapshot: z.string().optional(),
});

export const proposeHealingResultSchema = z.object({
  shouldHeal: z.boolean(),
  confidence: z.number().min(0).max(1),
  diagnosis: z.string().min(1),
  changes: z.array(
    z.object({
      kind: z.enum(["selector", "wait", "assertion", "test_data", "none"]),
      before: z.string().optional(),
      after: z.string().optional(),
      reason: z.string().min(1),
    }),
  ),
  risks: z.array(z.string().min(1)),
  requiresReview: z.boolean(),
});

export type ProposeHealingInput = z.infer<typeof proposeHealingInputSchema>;
export type ProposeHealingResult = z.infer<typeof proposeHealingResultSchema>;

export function proposeHealing(
  input: ProposeHealingInput,
  options: AiOperationOptions,
): Promise<ProposeHealingResult> {
  return executeOperation(
    prompts.proposeHealing,
    proposeHealingInputSchema,
    proposeHealingResultSchema,
    input,
    options,
    {
      timeoutMs: 25_000,
      retries: 1,
      maxTokens: 1_500,
      budget: { maxTotalTokens: 6_000, maxCostUsd: 0.2 },
    },
  );
}
