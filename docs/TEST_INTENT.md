# TestIntent Schema

Schema version: `1.0.0`

AI generates `TestIntent` documents. The compiler (`@testpilot/test-compiler`) deterministically emits Playwright TypeScript.

## Top-level fields

| Field | Description |
|-------|-------------|
| `schemaVersion` | Must be `1.0.0` |
| `id` | Stable test identifier |
| `title` | Human title |
| `businessObjective` | Why the test exists |
| `requirementRefs` | Traceability IDs |
| `riskLevel` | LOW \| MEDIUM \| HIGH \| CRITICAL |
| `tags` | Free-form tags |
| `preconditions` | Setup assumptions |
| `requiredRole` | Role needed |
| `requiredData` | Key/value test data |
| `environmentAssumptions` | Env assumptions |
| `actions` | Controlled actions |
| `assertions` | Controlled assertions |
| `cleanupActions` | Cleanup actions |
| `destructive` | Marks destructive tests |
| `expectedOutcome` | Expected business outcome |
| `traceability` | Source metadata |

## Allowed actions

`navigate`, `click`, `fill`, `selectOption`, `check`, `uncheck`, `uploadFile`, `pressKey`, `waitForResponse`, `apiRequest`, `saveValue`, `useSavedValue`

## Allowed assertions

`assertVisible`, `assertHidden`, `assertEnabled`, `assertDisabled`, `assertText`, `assertValue`, `assertUrl`, `assertStatus`, `assertHeader`, `assertJsonPath`, `assertJsonSchema`, `assertScreenshot`

## Forbidden

`eval`, shell commands, unrestricted JavaScript, dynamic package installs, arbitrary filesystem access, `javascript:` navigation.
