import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const generateTestPlanInputSchema = z.object({
  requirements: z.string().min(1),
  constraints: z.array(z.string().min(1)).optional(),
});

export const generateTestPlanResultSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  scope: z.object({
    included: z.array(z.string().min(1)),
    excluded: z.array(z.string().min(1)),
  }),
  testCases: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      priority: z.enum(["critical", "high", "medium", "low"]),
      type: z.enum(["functional", "negative", "security", "accessibility", "performance"]),
      preconditions: z.array(z.string().min(1)),
      steps: z.array(z.string().min(1)).min(1),
      expectedResult: z.string().min(1),
    }),
  ).min(1),
});

export type GenerateTestPlanInput = z.infer<
  typeof generateTestPlanInputSchema
>;
export type GenerateTestPlanResult = z.infer<
  typeof generateTestPlanResultSchema
>;

export function generateTestPlan(
  input: GenerateTestPlanInput,
  options: AiOperationOptions,
): Promise<GenerateTestPlanResult> {
  return executeOperation(
    prompts.generateTestPlan,
    generateTestPlanInputSchema,
    generateTestPlanResultSchema,
    input,
    options,
    {
      timeoutMs: 45_000,
      retries: 2,
      maxTokens: 3_000,
      budget: { maxTotalTokens: 10_000, maxCostUsd: 0.4 },
    },
  );
}
