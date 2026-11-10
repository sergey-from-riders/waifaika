import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("records actual wifi.eval.su location and distance updates", async ({ browser, request }, testInfo) => {
  test.skip(process.env.RECORD_LIVE_LOCATION !== "1", "Explicit live recording only");
  const origin = "https://wifi.eval.su";
  const placeResponse = await request.get(`${origin}/api/v1/places/0afa0c88-028e-5041-8959-53322a01128a`);
  expect(placeResponse.ok()).toBeTruthy();
  const place = await placeResponse.json();
  expect(place.place_name).toBe("Кофефорния");

  // Browser sensor emulation only. No application data, responses or UI are mocked.
  const position = (meters: number) => ({
    latitude: place.lat + (meters / 6_371_000) * (180 / Math.PI),
    longitude: place.lng,
    accuracy: 8,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ru-RU",
    colorScheme: "light",
    geolocation: position(1000),
    permissions: [],
    serviceWorkers: "allow",
    recordVideo: { dir: testInfo.outputPath("raw"), size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const video = page.video()!;
  const started = Date.now();
  const stages: { time: number; text: string }[] = [];
  const stage = (text: string) => {
    const time = (Date.now() - started) / 1000;
    stages.push({ time, text });
    console.log(`${time.toFixed(1)} s: ${text}`);
  };
  try {
    await page.goto(origin);
    await expect(page.getByRole("button", { name: "Кофефорния", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("clear-offline-button")).not.toContainText("0 МБ", { timeout: 30_000 });
    await expect(page.getByTestId("location-button")).toHaveText("Где я");
    await page.waitForTimeout(10_000);
    stage("wifi.eval.su — основная карта с реальными точками Wi-Fi");
    await page.waitForTimeout(2500);
    stage("Нажимаем «Где я»: приложение получает координаты");
    await context.grantPermissions(["geolocation"], { origin });
    await page.getByTestId("location-button").click();
    await expect(page.getByTestId("location-button")).toHaveText("Вы");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: testInfo.outputPath("position.png") });

    stage("Выбираем Кофефорнию: от пользователя до точки — 1 км");
    await page.getByRole("button", { name: "Кофефорния", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Кофефорния", exact: true })).toBeVisible();
    await expect(page.getByText("Точка находится от вас")).toBeVisible();
    await expect(page.getByText(/^(1\.0 км|1000 м)$/)).toBeVisible();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: testInfo.outputPath("distance-1000.png") });

    stage("Положение меняется — расстояние в карточке пересчитывается");
    for (let meters = 950; meters >= 600; meters -= 50) {
      await context.setGeolocation(position(meters));
      await page.waitForTimeout(500);
    }
    await expect(page.getByText("600 м", { exact: true })).toBeVisible();
    await page.waitForTimeout(2500);

    stage("Зелёный маркер на карте следует за положением пользователя");
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.waitForTimeout(1500);
    for (let meters = 550; meters >= 250; meters -= 50) {
      await context.setGeolocation(position(meters));
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500);
    stage("Снова открываем объект: теперь до него 250 метров");
    // At the overview zoom nearby pins are decluttered. Zoom in, as a visitor
    // would, to expose the same place after closing its selected-state pin.
    await page.mouse.move(640, 540);
    await page.mouse.wheel(0, -650);
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Кофефорния", exact: true }).click({ position: { x: 29, y: 18 }, timeout: 10_000 });
    await expect(page.getByText("250 м", { exact: true })).toBeVisible();
    await expect(page.getByText("Точка находится от вас")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("distance-250.png") });
    await page.waitForTimeout(4000);
    stage("Конец записи");
    await writeFile(testInfo.outputPath("stages.json"), JSON.stringify(stages, null, 2));
  } finally {
    await context.close().catch(() => undefined);
    await video.saveAs(testInfo.outputPath("wifi-location.webm"));
  }
});
