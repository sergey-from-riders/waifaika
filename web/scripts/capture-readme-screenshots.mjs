import { chromium, devices } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const webDir = path.join(rootDir, "web");
const screenshotsDir = path.join(rootDir, "docs", "screenshots");
const previewUrl = "http://127.0.0.1:4173";

function nowIso() {
  return new Date("2026-03-15T10:00:00Z").toISOString();
}

function createInitialState() {
  return {
    me: {
      user: {
        user_id: "user-1",
        user_type: "anonymous",
        display_name: null,
        is_active: true,
        version: 1,
        created_at: nowIso(),
        updated_at: nowIso(),
        last_seen_at: nowIso(),
      },
      session: {
        session_id: "session-1",
        expires_at: "2026-03-16T10:00:00Z",
        is_secure: true,
        cookie_name: "wifiyka_session",
      },
    },
    places: [
      {
        place_id: "place-1",
        user_id: "user-2",
        venue_type: "cafe",
        place_name: "Surf Coffee",
        wifi_name: "guest_wifi",
        description: "Навагинская, 3",
        promo_text: "Фильтр и булочки",
        access_type: "free",
        status: "active",
        lat: 43.5855,
        lng: 39.7231,
        works_count: 8,
        not_works_count: 2,
        last_verified_at: nowIso(),
        version: 1,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ],
    votes: [],
    nextVoteId: 1,
    nextPlaceId: 2,
  };
}

async function installAppMocks(page) {
  const state = createInitialState();

  await page.addInitScript(() => {
    const position = {
      coords: {
        latitude: 43.5855,
        longitude: 39.7231,
        accuracy: 12,
      },
      timestamp: Date.now(),
    };

    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    window.confirm = () => true;

    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: async () => ({
          state: "granted",
          addEventListener() {},
          removeEventListener() {},
        }),
      },
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success(position),
        watchPosition: (success) => {
          success(position);
          return 1;
        },
        clearWatch: () => undefined,
      },
    });
  });

  await page.route("**/api/v1/session/bootstrap", async (route) => handleApiRoute(route, state));
  await page.route("**/api/v1/**", async (route) => handleApiRoute(route, state));

  await page.route("https://nominatim.openstreetmap.org/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/search")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            lat: "43.5857",
            lon: "39.7234",
            display_name: "Навагинская улица, 3, Сочи",
            address: {
              road: "Навагинская улица",
              house_number: "3",
              city: "Сочи",
              state: "Краснодарский край",
            },
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        display_name: "Морской вокзал, Сочи",
        address: {
          road: "Несебрская улица",
          house_number: "3",
          city: "Сочи",
          state: "Краснодарский край",
        },
      }),
    });
  });

  return state;
}

async function handleApiRoute(route, state) {
  const request = route.request();
  const url = new URL(request.url());

  if (url.pathname === "/api/v1/session/bootstrap") {
    await json(route, state.me);
    return;
  }

  if (url.pathname === "/api/v1/me" && request.method() === "GET") {
    await json(route, state.me);
    return;
  }

  if (url.pathname === "/api/v1/sync/bootstrap" && request.method() === "GET") {
    await json(route, {
      me: state.me,
      nearby_places: state.places,
      my_places: state.places.filter((place) => place.user_id === state.me.user.user_id),
      my_votes: state.votes,
      offline_packs: [],
      server_time: nowIso(),
    });
    return;
  }

  if (url.pathname === "/api/v1/offline/manifest" && request.method() === "GET") {
    await json(route, {
      packs: [],
      radius_km: Number(url.searchParams.get("radius_km") || 100),
      server_time: nowIso(),
    });
    return;
  }

  if (url.pathname.startsWith("/api/v1/places/") && url.pathname.endsWith("/vote") && request.method() === "POST") {
    const placeId = url.pathname.split("/")[4];
    const payload = request.postDataJSON();
    const vote = upsertVote(state, placeId, payload.vote);
    await json(route, vote);
    return;
  }

  if (url.pathname.startsWith("/api/v1/places/") && url.pathname.endsWith("/vote") && request.method() === "DELETE") {
    const placeId = url.pathname.split("/")[4];
    const removed = deleteVote(state, placeId);
    await json(route, {
      status: removed ? "deleted" : "already_deleted",
      place_id: placeId,
      place_vote_id: removed?.place_vote_id || `vote-${state.nextVoteId}`,
    });
    return;
  }

  if (url.pathname.startsWith("/api/v1/places/") && request.method() === "GET") {
    const placeId = url.pathname.split("/")[4];
    const place = state.places.find((item) => item.place_id === placeId);
    if (!place) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "not_found", message: "not found" }, request_id: "req-1" }),
      });
      return;
    }
    await json(route, place);
    return;
  }

  if (url.pathname === "/api/v1/sync/outbox" && request.method() === "POST") {
    const payload = request.postDataJSON();
    const results = payload.operations.map((operation) => applyOutboxOperation(state, operation));
    await json(route, {
      results,
      server_time: nowIso(),
    });
    return;
  }

  if (url.pathname === "/api/v1/auth/email/start-bind" && request.method() === "POST") {
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "link_sent" }) });
    return;
  }

  if (url.pathname === "/api/v1/auth/email/start-login" && request.method() === "POST") {
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "link_sent" }) });
    return;
  }

  if (url.pathname === "/api/v1/auth/logout" && request.method() === "POST") {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "logged_out" }) });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok" }),
  });
}

function applyOutboxOperation(state, operation) {
  if (operation.entity_type === "place" && operation.operation_type === "create") {
    const placeId = `place-${state.nextPlaceId++}`;
    const payload = operation.payload;
    state.places.unshift({
      place_id: placeId,
      user_id: state.me.user.user_id,
      venue_type: payload.venue_type,
      place_name: payload.place_name,
      wifi_name: payload.wifi_name,
      description: payload.description || null,
      promo_text: payload.promo_text || null,
      access_type: payload.access_type,
      status: "active",
      lat: payload.lat,
      lng: payload.lng,
      works_count: 0,
      not_works_count: 0,
      last_verified_at: nowIso(),
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    return {
      client_operation_id: operation.client_operation_id,
      status: "applied",
      entity_id: placeId,
    };
  }

  return {
    client_operation_id: operation.client_operation_id,
    status: "applied",
    entity_id: operation.entity_id || null,
  };
}

function upsertVote(state, placeId, nextVote) {
  const place = state.places.find((item) => item.place_id === placeId);
  const existing = state.votes.find((item) => item.place_id === placeId && item.user_id === state.me.user.user_id);
  const createdAt = existing?.created_at || nowIso();
  const updatedAt = nowIso();

  if (existing) {
    if (existing.vote === nextVote) {
      return existing;
    }
    adjustCounts(place, existing.vote, -1);
    existing.vote = nextVote;
    existing.version += 1;
    existing.updated_at = updatedAt;
    adjustCounts(place, nextVote, 1);
    return existing;
  }

  const vote = {
    place_vote_id: `vote-${state.nextVoteId++}`,
    place_id: placeId,
    user_id: state.me.user.user_id,
    vote: nextVote,
    version: 1,
    created_at: createdAt,
    updated_at: updatedAt,
  };
  state.votes.push(vote);
  adjustCounts(place, nextVote, 1);
  return vote;
}

function deleteVote(state, placeId) {
  const voteIndex = state.votes.findIndex((item) => item.place_id === placeId && item.user_id === state.me.user.user_id);
  if (voteIndex === -1) {
    return null;
  }
  const [removed] = state.votes.splice(voteIndex, 1);
  const place = state.places.find((item) => item.place_id === placeId);
  adjustCounts(place, removed.vote, -1);
  return removed;
}

function adjustCounts(place, vote, delta) {
  if (!place) {
    return;
  }
  if (vote === "works") {
    place.works_count += delta;
    return;
  }
  place.not_works_count += delta;
}

async function json(route, payload) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not start: ${url}`);
}

function startPreviewServer() {
  return spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: webDir,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
    },
    stdio: "pipe",
  });
}

async function captureMobileScreenshots(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    colorScheme: "light",
    locale: "ru-RU",
    geolocation: { latitude: 43.5855, longitude: 39.7231 },
    permissions: ["geolocation", "clipboard-read", "clipboard-write"],
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await installAppMocks(page);

  await page.goto(`${previewUrl}/`);
  await page.getByText("Офлайн-карта Wi-Fi").waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "map-home.png"), fullPage: true });

  await page.goto(`${previewUrl}/place/place-1`);
  await page.getByText("Surf Coffee").waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "place-sheet.png"), fullPage: true });

  await page.goto(`${previewUrl}/`);
  await page.getByRole("button", { name: "Добавить Wi-Fi" }).click();
  await page.getByRole("button", { name: "Добавить Вайфай здесь" }).click();
  await page.getByRole("heading", { name: "Добавить Вайфай" }).waitFor();
  await page.getByLabel("Найти адрес на карте").fill("Навагинская, 3");
  await page.getByRole("button", { name: "Найти" }).click();
  await page.getByText("Навагинская улица, 3", { exact: true }).waitFor();
  await page.getByLabel("Адрес / ориентир").fill("Навагинская, 3");
  await page.getByLabel("Название места").fill("Mare Wi-Fi");
  await page.getByLabel("Название Wi-Fi").fill("mare_guest");
  await page.getByLabel("Промо").fill("Эспрессо и розетки у окна");
  await page.screenshot({ path: path.join(screenshotsDir, "add-flow.png"), fullPage: true });

  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.getByText("Точка сохранена").waitFor();
  await page.goto(`${previewUrl}/activity`);
  await page.getByText("Mare Wi-Fi").first().waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "activity.png"), fullPage: true });

  await page.goto(`${previewUrl}/about`);
  await page.getByRole("link", { name: "Открыть API UI" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(screenshotsDir, "about.png"), fullPage: true });

  await context.close();
}

async function captureApiDocsScreenshot(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1180 },
    colorScheme: "light",
    locale: "ru-RU",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.goto(`${previewUrl}/api-docs.html`);
  await page.locator("#swagger-ui .information-container").waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "api-docs.png"), fullPage: true });
  await context.close();
}

const previewServer = startPreviewServer();
previewServer.stderr.on("data", (chunk) => process.stderr.write(chunk));
previewServer.stdout.on("data", (chunk) => process.stdout.write(chunk));

let browser;

try {
  await mkdir(screenshotsDir, { recursive: true });
  await waitForServer(previewUrl);

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  await captureMobileScreenshots(browser);
  await captureApiDocsScreenshot(browser);
} finally {
  await browser?.close();
  previewServer.kill("SIGTERM");
}
