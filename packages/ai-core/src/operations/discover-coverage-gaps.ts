import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const discoverCoverageGapsInputSchema = z.object({
  requirements: z.string().min(1),
  existingTests: z.string().min(1),
});

export const discoverCoverageGapsResultSchema = z.object({
  coverageScore: z.number().min(0).max(100),
  gaps: z.array(
    z.object({
      requirementId: z.string().min(1),
      description: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]),
      suggestedTest: z.string().min(1),
    }),
  ),
  coveredRequirementIds: z.array(z.string().min(1)),
});

export type DiscoverCoverageGapsInput = z.infer<
  typeof discoverCoverageGapsInputSchema
>;
export type DiscoverCoverageGapsResult = z.infer<
  typeof discoverCoverageGapsResultSchema
>;

export function discoverCoverageGaps(
  input: DiscoverCoverageGapsInput,
  options: AiOperationOptions,
): Promise<DiscoverCoverageGapsResult> {
  return executeOperation(
    prompts.discoverCoverageGaps,
    discoverCoverageGapsInputSchema,
    discoverCoverageGapsResultSchema,
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
