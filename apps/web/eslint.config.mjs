import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: directory,
  recommendedConfig: js.configs.recommended,
});

export default [
  { ignores: [".next/**", "coverage/**", "playwright-report/**", "test-results/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
