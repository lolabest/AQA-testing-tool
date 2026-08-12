#!/usr/bin/env bash
set -euo pipefail

if node --input-type=module -e 'import { chromium } from "@playwright/test"; import { existsSync } from "node:fs"; process.exit(existsSync(chromium.executablePath()) ? 0 : 1)'; then
  echo "Playwright Chromium is already installed."
else
  pnpm exec playwright install chromium
fi
