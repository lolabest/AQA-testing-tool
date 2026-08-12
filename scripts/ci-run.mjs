#!/usr/bin/env node
/**
 * TestPilot CI helper — start a run, wait for completion, enforce quality gate.
 *
 * Usage:
 *   node scripts/ci-run.mjs --project <id> --environment <id> --token <jwt>
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    api: { type: "string", default: process.env.API_PUBLIC_URL ?? "http://localhost:3001" },
    project: { type: "string" },
    environment: { type: "string" },
    suite: { type: "string" },
    token: { type: "string" },
    timeout: { type: "string", default: "600000" },
  },
});

if (!values.project || !values.environment || !values.token) {
  console.error("Required: --project --environment --token");
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${values.token}`,
  "Content-Type": "application/json",
  "x-correlation-id": `ci-${Date.now()}`,
};

const startRes = await fetch(`${values.api}/api/v1/projects/${values.project}/runs`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    environmentId: values.environment,
    suiteId: values.suite,
    browsers: ["chromium"],
  }),
});

if (!startRes.ok) {
  console.error("Failed to start run", await startRes.text());
  process.exit(1);
}

const run = await startRes.json();
console.log(`Started run ${run.id}`);

const deadline = Date.now() + Number(values.timeout);
let final = run;
while (Date.now() < deadline) {
  const res = await fetch(`${values.api}/api/v1/runs/${run.id}`, { headers });
  final = await res.json();
  console.log(`status=${final.status}`);
  if (["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(final.status)) {
    break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}

const summary = final.summary ?? {};
console.log(
  `Done: passed=${summary.passed ?? 0} failed=${summary.failed ?? 0} flaky=${summary.flaky ?? 0} gate=${final.qualityGatePassed}`,
);

if (final.qualityGatePassed === false || final.status === "FAILED") {
  process.exit(1);
}
