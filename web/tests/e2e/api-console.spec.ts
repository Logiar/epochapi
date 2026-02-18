import { expect, test } from "@playwright/test";

test("updates curl preview when query fields change", async ({ page }) => {
  await page.goto("/api");

  const operation = page.locator('[data-operation-id="getNow"]');
  await operation.getByLabel("format (query)").selectOption("iso");

  await expect(operation.locator(".curl-output")).toContainText("format=iso");
});

test("supports keyboard navigation to first API action", async ({ page }) => {
  await page.goto("/api");

  await page.keyboard.press("Tab");

  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  expect(focused).toContain("Skip to main content");
});
