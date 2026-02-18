import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/api", "/use-cases/trusted-time", "/accessibility"];

for (const route of routes) {
  test(`has no serious accessibility violations: ${route}`, async ({ page }) => {
    await page.goto(route);
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    const seriousOrWorse = accessibilityScanResults.violations.filter((violation) =>
      violation.nodes.some((node) => ["serious", "critical"].includes(node.impact ?? "")),
    );

    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
}
