import { expect, test } from "@playwright/test";

test("all territory scenarios select objects and preserve their deep link", async ({
  page,
}) => {
  await page.goto("/demo/golf");
  await expect(page.getByTestId("demo-distance")).toHaveText(/1\s?000 м/);
  const scenarios = [
    {
      name: "Гольф-клуб",
      route: "golf",
      place: "Первая лунка",
      meters: "620 м",
      initial: /1\s?000 м/,
    },
    {
      name: "Отель",
      route: "hotel",
      place: "Бассейн",
      meters: "350 м",
      initial: /850 м/,
    },
    {
      name: "Кампус",
      route: "campus",
      place: "Библиотека",
      meters: "430 м",
      initial: /700 м/,
    },
    {
      name: "Город",
      route: "city",
      place: "Площадь",
      meters: "320 м",
      initial: /550 м/,
    },
  ];
  for (const scenario of scenarios) {
    await page
      .getByRole("button", { name: scenario.name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/demo/${scenario.route}$`));
    await expect(page.getByTestId("demo-distance")).toHaveText(
      scenario.initial,
    );
    await page
      .getByRole("button", { name: `Выбрать: ${scenario.place}`, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 3 })).toHaveText(
      scenario.place,
    );
    await expect(page.getByTestId("demo-distance")).toHaveText(scenario.meters);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(
      page.getByRole("button", { name: scenario.name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});

test("movement updates measured distance, pauses and resets", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/demo/golf");
  await expect(page.getByTestId("demo-distance")).toHaveText(/1\s?000 м/);
  await page
    .getByRole("button", { name: "Показать движение", exact: true })
    .click();
  await page.clock.fastForward(6_000);
  const half = await page.getByTestId("demo-distance").innerText();
  expect(Number(half.replace(/\D/g, ""))).toBeGreaterThan(500);
  expect(Number(half.replace(/\D/g, ""))).toBeLessThan(800);
  await page.getByRole("button", { name: "Остановить", exact: true }).click();
  const paused = await page.getByTestId("demo-distance").innerText();
  await page.clock.fastForward(3_000);
  await expect(page.getByTestId("demo-distance")).toHaveText(paused);
  await page
    .getByRole("button", { name: "Показать движение", exact: true })
    .click();
  await page.clock.fastForward(13_000);
  await expect(page.getByTestId("demo-distance")).toHaveText("250 м");
  await expect(
    page.getByRole("button", { name: "Показать движение", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "В начало", exact: true }).click();
  await expect(page.getByTestId("demo-distance")).toHaveText(/1\s?000 м/);
});

test("tech hero is operable and video and scenario links are available", async ({
  page,
}) => {
  await page.goto("/tech");
  const hero = page.locator(".tech-hero");
  await expect(hero.getByTestId("demo-distance")).toHaveText(/1\s?000 м/);
  await expect(
    page.getByText("Территория сохранена", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Парк", exact: true }),
  ).toHaveCount(0);
  await hero.getByRole("button", { name: "Отель", exact: true }).click();
  await hero
    .getByRole("button", { name: "Выбрать: Ресторан", exact: true })
    .click();
  await expect(hero.getByTestId("demo-distance")).toHaveText("480 м");
  await hero.getByRole("link", { name: "Смотреть видео", exact: true }).click();
  await expect(page).toHaveURL(/#demo$/);
  await expect(page.locator("video source")).toHaveAttribute(
    "src",
    "/demo/wifi-location.mp4",
  );
  const scenarios = page.locator("#scenarios");
  await scenarios.getByRole("button", { name: "Кампус", exact: true }).click();
  await expect(
    scenarios.getByRole("link", { name: "Открыть на весь экран" }),
  ).toHaveAttribute("href", "/demo/campus");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
