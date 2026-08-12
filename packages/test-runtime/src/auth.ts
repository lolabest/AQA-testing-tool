import type { BrowserContextOptions } from "@playwright/test";

export type AuthFixtureConfig =
  | { strategy: "NONE" }
  | { strategy: "BASIC"; username: string; password: string }
  | { strategy: "BEARER"; token: string }
  | { strategy: "STORAGE_STATE"; path: string }
  | {
      strategy: "FORM";
      loginPath: string;
      username: string;
      password: string;
      usernameSelector: string;
      passwordSelector: string;
      submitSelector: string;
    };

export function authContextOptions(
  config: AuthFixtureConfig,
): BrowserContextOptions {
  switch (config.strategy) {
    case "NONE":
    case "FORM":
      return {};
    case "BASIC":
      return {
        httpCredentials: {
          username: config.username,
          password: config.password,
        },
      };
    case "BEARER":
      return { extraHTTPHeaders: { authorization: `Bearer ${config.token}` } };
    case "STORAGE_STATE":
      return { storageState: config.path };
  }
}

/**
 * Performs form authentication when requested. Other strategies are applied
 * while creating the browser context through authContextOptions.
 */
export async function performFormAuthentication(
  page: {
    goto(url: string): Promise<unknown>;
    locator(selector: string): {
      fill(value: string): Promise<unknown>;
      click(): Promise<unknown>;
    };
  },
  config: AuthFixtureConfig,
): Promise<void> {
  if (config.strategy !== "FORM") return;
  await page.goto(config.loginPath);
  await page.locator(config.usernameSelector).fill(config.username);
  await page.locator(config.passwordSelector).fill(config.password);
  await page.locator(config.submitSelector).click();
}
