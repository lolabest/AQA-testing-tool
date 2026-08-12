import { z } from "zod";

export const TEST_INTENT_SCHEMA_VERSION = "1.0.0" as const;
export const COMPILER_TARGET = "playwright-typescript" as const;

const LocatorSchema = z.object({
  strategy: z.enum([
    "role",
    "label",
    "placeholder",
    "testId",
    "text",
    "css",
  ]),
  value: z.string().min(1),
  name: z.string().optional(),
  exact: z.boolean().optional(),
  reason: z.string().optional(),
});

const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    url: z.string().min(1),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("click"),
    target: LocatorSchema,
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("fill"),
    target: LocatorSchema,
    value: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("selectOption"),
    target: LocatorSchema,
    value: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("check"),
    target: LocatorSchema,
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("uncheck"),
    target: LocatorSchema,
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("uploadFile"),
    target: LocatorSchema,
    filePath: z.string().min(1),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("pressKey"),
    key: z.string().min(1),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("waitForResponse"),
    urlGlob: z.string().min(1),
    status: z.number().int().optional(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("apiRequest"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string().min(1),
    body: z.unknown().optional(),
    headers: z.record(z.string()).optional(),
    saveAs: z.string().optional(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("saveValue"),
    name: z.string().min(1),
    from: LocatorSchema,
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("useSavedValue"),
    name: z.string().min(1),
    target: LocatorSchema,
    description: z.string().optional(),
  }),
]);

const AssertionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("assertVisible"),
    target: LocatorSchema,
  }),
  z.object({
    type: z.literal("assertHidden"),
    target: LocatorSchema,
  }),
  z.object({
    type: z.literal("assertEnabled"),
    target: LocatorSchema,
  }),
  z.object({
    type: z.literal("assertDisabled"),
    target: LocatorSchema,
  }),
  z.object({
    type: z.literal("assertText"),
    target: LocatorSchema,
    expected: z.string(),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("assertValue"),
    target: LocatorSchema,
    expected: z.string(),
  }),
  z.object({
    type: z.literal("assertUrl"),
    expected: z.string(),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("assertStatus"),
    expected: z.number().int(),
    fromSaved: z.string().optional(),
  }),
  z.object({
    type: z.literal("assertHeader"),
    name: z.string(),
    expected: z.string(),
    fromSaved: z.string().optional(),
  }),
  z.object({
    type: z.literal("assertJsonPath"),
    path: z.string(),
    expected: z.unknown(),
    fromSaved: z.string().optional(),
  }),
  z.object({
    type: z.literal("assertJsonSchema"),
    schema: z.record(z.unknown()),
    fromSaved: z.string().optional(),
  }),
  z.object({
    type: z.literal("assertScreenshot"),
    name: z.string(),
    maxDiffPixels: z.number().int().optional(),
  }),
]);

export const TestIntentSchema = z
  .object({
    schemaVersion: z.literal(TEST_INTENT_SCHEMA_VERSION),
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    businessObjective: z.string().min(1),
    requirementRefs: z.array(z.string()).default([]),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    tags: z.array(z.string()).default([]),
    preconditions: z.array(z.string()).default([]),
    requiredRole: z.string().optional(),
    requiredData: z.record(z.string()).default({}),
    environmentAssumptions: z.array(z.string()).default([]),
    actions: z.array(ActionSchema).min(1),
    assertions: z.array(AssertionSchema).min(1),
    cleanupActions: z.array(ActionSchema).default([]),
    destructive: z.boolean().default(false),
    expectedOutcome: z.string().min(1),
    traceability: z
      .object({
        source: z.string().optional(),
        notes: z.string().optional(),
      })
      .default({}),
  })
  .superRefine((intent, ctx) => {
    const forbidden = /(eval\(|child_process|require\(|import\(|process\.env|fs\.|shell)/i;
    const blob = JSON.stringify(intent);
    if (forbidden.test(blob)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsafe construct detected in TestIntent",
      });
    }
    for (const action of intent.actions) {
      if (action.type === "navigate" && action.url.startsWith("javascript:")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "javascript: navigation is forbidden",
        });
      }
    }
  });

export type TestIntent = z.infer<typeof TestIntentSchema>;
export type TestAction = z.infer<typeof ActionSchema>;
export type TestAssertion = z.infer<typeof AssertionSchema>;
export type LocatorSpec = z.infer<typeof LocatorSchema>;

export function validateTestIntent(input: unknown): TestIntent {
  return TestIntentSchema.parse(input);
}

export function isSafeTestIntent(input: unknown): input is TestIntent {
  return TestIntentSchema.safeParse(input).success;
}
