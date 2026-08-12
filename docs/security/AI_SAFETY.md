# AI Safety — TestPilot AI

## Principles

1. **Structured outputs only** for operational decisions — never parse free-form Markdown for execution.
2. **Budgets and timeouts** on every AI operation.
3. **Audit every invocation** (provider, model, prompt version, tokens, cost, validation, correlation ID).
4. **Redact secrets** before persistence.
5. **Fail closed** when the provider is unavailable or output fails schema validation.
6. **Untrusted content isolation** — website text is data, never instructions.

## Operations

Each operation has its own system prompt and Zod schema:

- `analyzeRequirements`
- `generateTestPlan`
- `generateTestIntents`
- `discoverCoverageGaps`
- `classifyFailure`
- `proposeHealing`
- `summarizeRun`

## Prompt injection

Discovered page content is wrapped as untrusted data. System prompts instruct models to ignore instructions found inside page content. Fixtures in tests include injection strings such as “Ignore previous instructions…”.

## Self-healing limits

AI may propose locator/route updates only. It cannot weaken assertions, change business expectations, add fixed waits, or increase retries to hide flakes. Human approval is required by default.
