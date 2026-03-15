import { expect, test, type Locator } from "@playwright/test";

import { installAppMocks, readClipboardWrites, readConfirmWrites } from "./support/mockApp";

test.beforeEach(async ({ page }) => {
  await installAppMocks(page);
});

async function expectNoOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlaps =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y;

  expect(overlaps).toBe(false);
}

test("opens map root, deep link, copies share URL and closes place sheet", async ({ page, baseURL }) => {
  await page.goto("/");

  await expect(page.getByText("Офлайн-карта Wi-Fi")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Добавить Wi-Fi" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("theme-toggle")).toBeVisible();
  await expect(page.getByTestId("clear-offline-button")).toBeVisible();
  await expect(page.getByTestId("nearest-hint-card")).toBeVisible();
  await expect(page.getByTestId("location-button")).toBeVisible();
  await expect(page.getByTestId("bottom-nav")).toBeVisible();
  await expectNoOverlap(page.getByTestId("theme-toggle"), page.getByTestId("map-top-title-group"));
  await expectNoOverlap(page.getByTestId("clear-offline-button"), page.getByTestId("map-top-title-group"));
  await expectNoOverlap(page.getByTestId("nearest-hint-card"), page.getByTestId("location-button"));
  await expectNoOverlap(page.getByTestId("nearest-hint-card"), page.getByTestId("bottom-nav"));
  await expectNoOverlap(page.getByTestId("location-button"), page.getByTestId("bottom-nav"));

  await page.goto("/place/place-1");

  await expect(page.getByText("Surf Coffee")).toBeVisible();
  await expect(page.getByText("Навагинская, 3")).toBeVisible();
  await expect(page.getByRole("button", { name: /Скопировать координаты/i })).toBeVisible();
  await expect(page.getByText("Добавлено пользователем")).toHaveCount(0);
  await expect(page.getByText("Поделитесь точкой с друзьями")).toHaveCount(0);
  await page.getByRole("button", { name: "Поделиться точкой" }).click();

  await expect
    .poll(async () => {
      const writes = await readClipboardWrites(page);
      return writes.at(-1);
    })
    .toBe(`${baseURL}/place/place-1`);

  await page.getByRole("button", { name: /^Закрыть$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Поделиться точкой" })).toHaveCount(0);
});

test("creates, removes and switches vote states via sync outbox", async ({ page }) => {
  await page.goto("/place/place-1");

  const works = page.getByRole("button", { name: /^Работает/ });
  const notWorks = page.getByRole("button", { name: /^Не работает/ });

  await expect(works).toContainText("8", { timeout: 15_000 });
  await expect(notWorks).toContainText("2", { timeout: 15_000 });

  await works.click();
  await expect(works).toContainText("9", { timeout: 15_000 });
  await expect(notWorks).toContainText("2", { timeout: 15_000 });

  await works.click();
  await expect(works).toContainText("8", { timeout: 15_000 });
  await expect(notWorks).toContainText("2", { timeout: 15_000 });

  await notWorks.click();
  await expect(works).toContainText("8", { timeout: 15_000 });
  await expect(notWorks).toContainText("3", { timeout: 15_000 });

  await works.click();
  await expect(works).toContainText("9", { timeout: 15_000 });
  await expect(notWorks).toContainText("2", { timeout: 15_000 });
});

test("runs add-flow with promo textarea and exposes public API links in about", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Добавить Wi-Fi" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Добавить Wi-Fi" }).click();
  await expect(page.getByText("Двигайте карту под Wi-Fi маркер")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Добавить Вайфай здесь" }).click();
  await expect(page.getByRole("heading", { name: "Добавить Вайфай" })).toBeVisible();

  const geocodeField = page.getByLabel("Найти адрес на карте");
  await expect(geocodeField).toBeVisible();
  await geocodeField.fill("Навагинская, 3");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.getByText("Навагинская улица, 3", { exact: true })).toBeVisible({ timeout: 15_000 });

  const addressField = page.getByLabel("Адрес / ориентир");
  await expect(addressField).toBeVisible();
  const promoField = page.getByLabel("Промо");
  await expect(promoField).toBeVisible();
  await expect(promoField.evaluate((node) => node.tagName)).resolves.toBe("TEXTAREA");

  await addressField.fill("Навагинская, 3");
  await page.getByLabel("Название места").fill("Mare Wi-Fi");
  await page.getByLabel("Название Wi-Fi").fill("mare_guest");
  await promoField.fill("Эспрессо и розетки у окна");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Точка сохранена")).toBeVisible({ timeout: 15_000 });

  await page.goto("/activity");
  await expect(page.getByText("Mare Wi-Fi").first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/");
  await page.getByRole("button", { name: /Очистить офлайн/i }).click();
  await expect
    .poll(async () => {
      const writes = await readConfirmWrites(page);
      return writes.at(-1);
    })
    .toContain("Если потом пропадёт интернет");

  await page.getByRole("button", { name: "О приложении" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByText("API", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "openapi.yaml" })).toHaveAttribute("href", "https://wifi.eval.su/openapi.yaml");
  await expect(page.getByText("https://wifi.eval.su/api/v1")).toBeVisible();
});
