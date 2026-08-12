import { z } from "zod";

export const RoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "QA_ENGINEER",
  "DEVELOPER",
  "VIEWER",
]);

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const TestCaseStatusSchema = z.enum([
  "DRAFT",
  "GENERATED",
  "VALIDATED",
  "APPROVED",
  "ACTIVE",
  "DISABLED",
  "ARCHIVED",
]);

export const TestRunStatusSchema = z.enum([
  "QUEUED",
  "PREPARING",
  "RUNNING",
  "COLLECTING_ARTIFACTS",
  "TRIAGING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

export const AttemptOutcomeSchema = z.enum([
  "PASSED",
  "FAILED",
  "SKIPPED",
  "BLOCKED",
  "TIMED_OUT",
  "CANCELLED",
  "FLAKY",
]);

export const FailureClassificationSchema = z.enum([
  "PRODUCT_DEFECT",
  "TEST_DEFECT",
  "ENVIRONMENT_ISSUE",
  "TEST_DATA_ISSUE",
  "FLAKY_BEHAVIOR",
  "UNKNOWN",
]);

export const UuidSchema = z.string().uuid();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  key: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[A-Z][A-Z0-9_]*$/),
});

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(2).max(80),
  kind: z.enum(["LOCAL", "TEST", "STAGING", "PRODUCTION_LIKE"]),
  baseUrl: z.string().url(),
  apiBaseUrl: z.string().url().optional(),
  allowedDomains: z.array(z.string().min(1)).min(1),
  authStrategy: z.enum(["NONE", "FORM", "BASIC", "BEARER", "STORAGE_STATE"]),
  browserProjects: z.array(z.string()).default(["chromium"]),
  parallelismLimit: z.number().int().min(1).max(32).default(2),
  timeoutMs: z.number().int().min(1000).default(30_000),
  allowDestructiveTests: z.boolean().default(false),
});

export const CreateRequirementSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(10_000),
  criticality: RiskLevelSchema.default("MEDIUM"),
  tags: z.array(z.string()).default([]),
});

export const ImportRequirementsSchema = z.object({
  format: z.enum(["TEXT", "MARKDOWN", "JSON"]),
  content: z.string().min(1),
});

export const ImportApiSpecSchema = z.object({
  format: z.enum(["OPENAPI", "POSTMAN"]),
  content: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
});

export const ApproveTestCaseSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const CreateRunSchema = z.object({
  suiteId: UuidSchema.optional(),
  testCaseIds: z.array(UuidSchema).optional(),
  environmentId: UuidSchema,
  browsers: z.array(z.string()).default(["chromium"]),
  allowDestructive: z.boolean().default(false),
  approvalToken: z.string().optional(),
});

export const AiProviderKindSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "openai_compatible",
  "mock",
]);

export const UpsertAiConfigurationSchema = z.object({
  provider: AiProviderKindSchema,
  modelId: z.string().min(1).max(120),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  isDefault: z.boolean().default(false),
  maxTokens: z.number().int().min(256).max(128_000).default(4096),
  temperature: z.number().min(0).max(2).default(0.2),
});

export const HealingDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(2000).optional(),
});

export const GeneratePlanSchema = z.object({
  requirementIds: z.array(UuidSchema).min(1),
  includeDiscovery: z.boolean().default(false),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;
export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>;
export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type UpsertAiConfigurationInput = z.infer<
  typeof UpsertAiConfigurationSchema
>;
