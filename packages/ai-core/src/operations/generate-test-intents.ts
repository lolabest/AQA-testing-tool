import { z } from "zod";
import { prompts } from "../prompts.js";
import { executeOperation, type AiOperationOptions } from "./common.js";

export const generateTestIntentsInputSchema = z.object({
  testPlan: z.string().min(1),
  applicationContext: z.string().optional(),
});

export const generateTestIntentsResultSchema = z.object({
  intents: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      goal: z.string().min(1),
      preconditions: z.array(z.string().min(1)),
      actions: z.array(
        z.object({
          action: z.string().min(1),
          target: z.string().min(1),
          value: z.string().optional(),
        }),
      ).min(1),
      assertions: z.array(z.string().min(1)).min(1),
      tags: z.array(z.string().min(1)),
    }),
  ).min(1),
});

export type GenerateTestIntentsInput = z.infer<
  typeof generateTestIntentsInputSchema
>;
export type GenerateTestIntentsResult = z.infer<
  typeof generateTestIntentsResultSchema
>;

export function generateTestIntents(
  input: GenerateTestIntentsInput,
  options: AiOperationOptions,
): Promise<GenerateTestIntentsResult> {
  return executeOperation(
    prompts.generateTestIntents,
    generateTestIntentsInputSchema,
    generateTestIntentsResultSchema,
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
