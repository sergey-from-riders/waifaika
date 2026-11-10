import { test, expect } from "@playwright/test";
import { installAppMocks } from "./support/mockApp";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test.use({ serviceWorkers: "allow" });

test("installed shell, deep links and local edits survive a real offline reload", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.text().includes("Worker failed")) errors.push(message.text());
  });
  const pack = readFileSync("../deploy/offline-packs/sochi.pmtiles");
  const packs = [
    {
      pack_id: "sochi",
      region_name: "Sochi",
      url: "/offline-packs/sochi.pmtiles",
      size_bytes: pack.length,
      version_hash: createHash("sha256").update(pack).digest("hex"),
      updated_at: new Date().toISOString(),
    },
  ];
  await installAppMocks(page, { serviceWorker: true, packs });
  await page.route("**/offline-packs/sochi.pmtiles", (route) =>
    route.fulfill({ body: pack, contentType: "application/octet-stream" }),
  );
  await page.goto("/place/place-1");
  await expect(page.getByText("Surf Coffee")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        page.evaluate(async () =>
          Boolean(
            await (
              await caches.open("wifiyka-manual-packs")
            ).match("/offline-packs/sochi.pmtiles"),
          ),
        ),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.unrouteAll({ behavior: "wait" });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Surf Coffee")).toBeVisible();
  await page.getByRole("button", { name: /^Работает/ }).click();
  await expect(page.getByRole("button", { name: /^Работает/ })).toContainText(
    "9",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: /^Работает/ })).toContainText(
    "9",
  );
  await page.goto("/tech");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ваша территория",
  );
  await expect(page.locator(".geo-tech")).toBeVisible();
  const widths = await page.evaluate(() => [
    innerWidth,
    document.documentElement.scrollWidth,
  ]);
  expect(widths[1]).toBeLessThanOrEqual(widths[0]);
  await page.goto("/demo/golf");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Как найти объект");
  await page.getByRole("button", { name: "Смотреть демонстрацию" }).click();
  await expect(page.getByTestId("demo-distance")).toHaveText("2.3 км", { timeout: 12_000 });
  await page.reload();
  await expect(page.getByTestId("demo-distance")).toHaveText("—");
  await page.goto("/api-docs.html");
  await expect(page.getByText("Wifiyka API reference")).toBeVisible();
  await context.setOffline(false);
  const state = await installAppMocks(page, { serviceWorker: true, packs });
  await page.goto("/place/place-1");
  await expect.poll(() => state.votes.length).toBe(1);
  await expect(page.getByRole("button", { name: /^Работает/ })).toContainText(
    "9",
  );
  await page.reload();
  await expect.poll(() => state.votes.length).toBe(1);
  expect(errors).toEqual([]);
});
