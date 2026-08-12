import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const summarizeRunInputSchema = z.object({
  runName: z.string().min(1),
  results: z.string().min(1),
  durationMs: z.number().nonnegative().optional(),
});

export const summarizeRunResultSchema = z.object({
  headline: z.string().min(1),
  status: z.enum(["passed", "passed_with_risk", "failed", "inconclusive"]),
  totals: z.object({
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
  highlights: z.array(z.string().min(1)),
  risks: z.array(z.string().min(1)),
  nextActions: z.array(z.string().min(1)),
});

export type SummarizeRunInput = z.infer<typeof summarizeRunInputSchema>;
export type SummarizeRunResult = z.infer<typeof summarizeRunResultSchema>;

export function summarizeRun(
  input: SummarizeRunInput,
  options: AiOperationOptions,
): Promise<SummarizeRunResult> {
  return executeOperation(
    prompts.summarizeRun,
    summarizeRunInputSchema,
    summarizeRunResultSchema,
    input,
    options,
    {
      timeoutMs: 20_000,
      retries: 1,
      maxTokens: 1_200,
      budget: { maxTotalTokens: 5_000, maxCostUsd: 0.15 },
    },
  );
}
