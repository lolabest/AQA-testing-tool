import { createHash } from "node:crypto";
import {
  type LocatorSpec,
  type TestAction,
  type TestAssertion,
  type TestIntent,
  validateTestIntent,
  TEST_INTENT_SCHEMA_VERSION,
} from "@testpilot/test-ir";

export const COMPILER_VERSION = "1.0.0";

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function locatorExpr(target: LocatorSchemaLike): string {
  switch (target.strategy) {
    case "role":
      return `page.getByRole(${JSON.stringify(target.value)}${
        target.name
          ? `, { name: ${JSON.stringify(target.name)}${target.exact ? ", exact: true" : ""} }`
          : target.exact
            ? ", { exact: true }"
            : ""
      })`;
    case "label":
      return `page.getByLabel(${JSON.stringify(target.value)}${target.exact ? ", { exact: true }" : ""})`;
    case "placeholder":
      return `page.getByPlaceholder(${JSON.stringify(target.value)})`;
    case "testId":
      return `page.getByTestId(${JSON.stringify(target.value)})`;
    case "text":
      return `page.getByText(${JSON.stringify(target.value)}${target.exact ? ", { exact: true }" : ""})`;
    case "css":
      return `page.locator(${JSON.stringify(target.value)})`;
    default: {
      const _x: never = target.strategy;
      throw new Error(`Unsupported locator strategy: ${_x}`);
    }
  }
}

type LocatorSchemaLike = LocatorSpec;

function resolveData(value: string): string {
  const match = /^\{\{(\w+)\}\}$/.exec(value);
  if (match?.[1]) {
    return `String(testData[${JSON.stringify(match[1])}] ?? ${JSON.stringify(value)})`;
  }
  return JSON.stringify(value);
}

function compileAction(action: TestAction, indent: string): string {
  switch (action.type) {
    case "navigate":
      return `${indent}await page.goto(${JSON.stringify(action.url)});`;
    case "click":
      return `${indent}await ${locatorExpr(action.target)}.click();`;
    case "fill":
      return `${indent}await ${locatorExpr(action.target)}.fill(${resolveData(action.value)});`;
    case "selectOption":
      return `${indent}await ${locatorExpr(action.target)}.selectOption(${resolveData(action.value)});`;
    case "check":
      return `${indent}await ${locatorExpr(action.target)}.check();`;
    case "uncheck":
      return `${indent}await ${locatorExpr(action.target)}.uncheck();`;
    case "uploadFile":
      return `${indent}await ${locatorExpr(action.target)}.setInputFiles(${JSON.stringify(action.filePath)});`;
    case "pressKey":
      return `${indent}await page.keyboard.press(${JSON.stringify(action.key)});`;
    case "waitForResponse":
      return `${indent}await page.waitForResponse((res) => res.url().includes(${JSON.stringify(action.urlGlob)})${
        action.status ? ` && res.status() === ${action.status}` : ""
      });`;
    case "apiRequest": {
      const save = action.saveAs
        ? `${indent}saved[${JSON.stringify(action.saveAs)}] = response;\n`
        : "";
      return `${indent}{\n${indent}  const response = await request.${action.method.toLowerCase()}(${JSON.stringify(action.path)}, { data: ${
        action.body === undefined ? "undefined" : JSON.stringify(action.body)
      }, headers: ${JSON.stringify(action.headers ?? {})} });\n${save}${indent}}`;
    }
    case "saveValue":
      return `${indent}saved[${JSON.stringify(action.name)}] = await ${locatorExpr(action.from)}.innerText();`;
    case "useSavedValue":
      return `${indent}await ${locatorExpr(action.target)}.fill(String(saved[${JSON.stringify(action.name)}] ?? ""));`;
    default: {
      const _x: never = action;
      throw new Error(`Unsupported action: ${JSON.stringify(_x)}`);
    }
  }
}

function compileAssertion(assertion: TestAssertion, indent: string): string {
  switch (assertion.type) {
    case "assertVisible":
      return `${indent}await expect(${locatorExpr(assertion.target)}).toBeVisible();`;
    case "assertHidden":
      return `${indent}await expect(${locatorExpr(assertion.target)}).toBeHidden();`;
    case "assertEnabled":
      return `${indent}await expect(${locatorExpr(assertion.target)}).toBeEnabled();`;
    case "assertDisabled":
      return `${indent}await expect(${locatorExpr(assertion.target)}).toBeDisabled();`;
    case "assertText":
      return assertion.exact
        ? `${indent}await expect(${locatorExpr(assertion.target)}).toHaveText(${JSON.stringify(assertion.expected)});`
        : `${indent}await expect(${locatorExpr(assertion.target)}).toContainText(${JSON.stringify(assertion.expected)});`;
    case "assertValue":
      return `${indent}await expect(${locatorExpr(assertion.target)}).toHaveValue(${JSON.stringify(assertion.expected)});`;
    case "assertUrl":
      return assertion.exact
        ? `${indent}await expect(page).toHaveURL(${JSON.stringify(assertion.expected)});`
        : `${indent}await expect(page).toHaveURL(new RegExp(${JSON.stringify(
            assertion.expected.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"),
          )}));`;
    case "assertStatus":
      return `${indent}expect((saved[${JSON.stringify(assertion.fromSaved ?? "lastResponse")}] as { status: () => number }).status()).toBe(${assertion.expected});`;
    case "assertHeader":
      return `${indent}expect(((saved[${JSON.stringify(assertion.fromSaved ?? "lastResponse")}] as { headers: () => Record<string, string> }).headers())[${JSON.stringify(assertion.name)}]).toBe(${JSON.stringify(assertion.expected)});`;
    case "assertJsonPath":
      return `${indent}// JSON path assertion for ${esc(assertion.path)}\n${indent}expect(saved[${JSON.stringify(assertion.fromSaved ?? "lastResponse")}]).toBeTruthy();`;
    case "assertJsonSchema":
      return `${indent}// JSON schema assertion stored with intent\n${indent}expect(saved[${JSON.stringify(assertion.fromSaved ?? "lastResponse")}]).toBeTruthy();`;
    case "assertScreenshot":
      return `${indent}await expect(page).toHaveScreenshot(${JSON.stringify(assertion.name + ".png")}, { maxDiffPixels: ${assertion.maxDiffPixels ?? 100} });`;
    default: {
      const _x: never = assertion;
      throw new Error(`Unsupported assertion: ${JSON.stringify(_x)}`);
    }
  }
}

export interface CompileResult {
  code: string;
  compilerVersion: string;
  schemaVersion: string;
  checksum: string;
}

export function compileTestIntent(input: unknown): CompileResult {
  const intent: TestIntent = validateTestIntent(input);
  const lines: string[] = [];
  lines.push(`// Generated by TestPilot compiler ${COMPILER_VERSION}`);
  lines.push(`// schemaVersion=${TEST_INTENT_SCHEMA_VERSION} intentId=${intent.id}`);
  lines.push(`import { test, expect } from "@playwright/test";`);
  lines.push("");
  lines.push(`const testData = ${JSON.stringify(intent.requiredData, null, 2)} as Record<string, string>;`);
  lines.push("");
  lines.push(`test(${JSON.stringify(intent.title)}, async ({ page, request }) => {`);
  lines.push(`  const saved: Record<string, unknown> = {};`);
  if (intent.destructive) {
    lines.push(`  test.info().annotations.push({ type: "destructive", description: "true" });`);
  }
  for (const action of intent.actions) {
    if (action.description) {
      lines.push(`  // ${action.description}`);
    }
    lines.push(compileAction(action, "  "));
  }
  for (const assertion of intent.assertions) {
    lines.push(compileAssertion(assertion, "  "));
  }
  for (const cleanup of intent.cleanupActions) {
    lines.push(compileAction(cleanup, "  "));
  }
  lines.push(`});`);
  lines.push("");

  const code = lines.join("\n");
  const checksum = createHash("sha256").update(code).digest("hex");
  return {
    code,
    compilerVersion: COMPILER_VERSION,
    schemaVersion: TEST_INTENT_SCHEMA_VERSION,
    checksum,
  };
}
