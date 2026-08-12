import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const analyzeRequirementsInputSchema = z.object({
  requirements: z.string().min(1),
  context: z.string().optional(),
});

export const analyzeRequirementsResultSchema = z.object({
  summary: z.string().min(1),
  requirements: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      priority: z.enum(["critical", "high", "medium", "low"]),
      acceptanceCriteria: z.array(z.string().min(1)).min(1),
      risks: z.array(z.string().min(1)),
    }),
  ).min(1),
  ambiguities: z.array(z.string().min(1)),
});

export type AnalyzeRequirementsInput = z.infer<
  typeof analyzeRequirementsInputSchema
>;
export type AnalyzeRequirementsResult = z.infer<
  typeof analyzeRequirementsResultSchema
>;

export function analyzeRequirements(
  input: AnalyzeRequirementsInput,
  options: AiOperationOptions,
): Promise<AnalyzeRequirementsResult> {
  return executeOperation(
    prompts.analyzeRequirements,
    analyzeRequirementsInputSchema,
    analyzeRequirementsResultSchema,
    input,
    options,
    {
      timeoutMs: 30_000,
      retries: 2,
      maxTokens: 2_000,
      budget: { maxTotalTokens: 8_000, maxCostUsd: 0.25 },
    },
  );
}
