import { expect, test } from "@playwright/test";

test("golf demo locates the visitor, updates distance and restarts", async ({ page }) => {
  await page.clock.install();
  await page.goto("/demo/golf");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Как найти объект");
  await expect(page.getByTestId("demo-distance")).toHaveText("—");
  await page.getByRole("button", { name: "Смотреть демонстрацию" }).click();
  await page.clock.fastForward(8_000);
  await expect(page.getByTestId("demo-distance")).toHaveText("2.3 км");
  await expect(page.getByText("Вы здесь", { exact: true })).toBeVisible();
  await page.clock.fastForward(17_000);
  await expect(page.getByTestId("demo-distance")).toHaveText("943 м");
  await expect(page.getByText("Без сети · план сохранён")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Демонстрационные координаты");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByTestId("demo-distance")).toHaveText("—");
});
