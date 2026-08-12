import { expect, test } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

test("signs in and opens the seeded Demo Shop project", async ({ page, request }) => {
  const health = await request.get(`${apiUrl}/health`).catch(() => null);
  test.skip(!health?.ok(), `TestPilot API is unavailable at ${apiUrl}`);

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("qa@testpilot.local");
  await page.getByLabel("Password").fill("TestPilot1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Projects", exact: true }).first().click();
  await page.getByRole("link", { name: "DEMO-SHOP" }).click();
  await expect(page.getByRole("heading", { name: "Demo Shop" })).toBeVisible();
});
