# Threat Model — TestPilot AI

## Assets

- Workspace data (requirements, tests, results)
- Environment secrets and AI API keys
- Artifacts (traces may contain session tokens if not redacted)
- Execution capability against configured environments

## Trust boundaries

1. Browser ↔ API
2. API ↔ Worker / Redis / Postgres / S3
3. Worker ↔ Target application (SUT)
4. Worker ↔ AI providers
5. Untrusted SUT content ↔ AI prompts

## Key threats and mitigations

| Threat | Mitigation |
|--------|------------|
| Stolen AI keys | AES-256-GCM secret box; keys never sent to browser; replaceable with KMS |
| SSRF via discovery/run | URL allowlists, DNS rebinding checks, private IP blocks |
| Prompt injection from SUT | Separate untrusted content from system instructions; automated injection tests |
| Cross-workspace access | Membership checks on every query |
| Silent test mutation | Healing proposals require approval; version history + diff |
| Secret leakage in logs/artifacts | Redaction utilities; sensitive headers stripped |
| Destructive tests in prod-like | Explicit environment flag + permission + approval token |
| Webhook forgery | HMAC signatures with timestamp tolerance |

## Non-goals

Physical security, full DLP, and adversarial ML defenses beyond prompt-injection isolation are out of scope for v1.
