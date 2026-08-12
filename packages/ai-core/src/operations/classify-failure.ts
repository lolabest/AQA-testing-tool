import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const classifyFailureInputSchema = z.object({
  testName: z.string().min(1),
  error: z.string().min(1),
  logs: z.string().optional(),
  recentChanges: z.string().optional(),
});

export const classifyFailureResultSchema = z.object({
  category: z.enum([
    "product_defect",
    "test_defect",
    "environment",
    "data",
    "flaky",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  recommendedActions: z.array(z.string().min(1)).min(1),
});

export type ClassifyFailureInput = z.infer<typeof classifyFailureInputSchema>;
export type ClassifyFailureResult = z.infer<typeof classifyFailureResultSchema>;

export function classifyFailure(
  input: ClassifyFailureInput,
  options: AiOperationOptions,
): Promise<ClassifyFailureResult> {
  return executeOperation(
    prompts.classifyFailure,
    classifyFailureInputSchema,
    classifyFailureResultSchema,
    input,
    options,
    {
      timeoutMs: 20_000,
      retries: 1,
      maxTokens: 1_500,
      budget: { maxTotalTokens: 6_000, maxCostUsd: 0.2 },
    },
  );
}
