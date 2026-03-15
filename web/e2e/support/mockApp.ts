import type { Page, Route } from "@playwright/test";

type VoteType = "works" | "not_works";

type PlaceRecord = {
  place_id: string;
  user_id: string;
  venue_type: string;
  place_name: string;
  wifi_name: string;
  description: string | null;
  promo_text: string | null;
  access_type: string;
  status: string;
  lat: number;
  lng: number;
  works_count: number;
  not_works_count: number;
  last_verified_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type VoteRecord = {
  place_vote_id: string;
  place_id: string;
  user_id: string;
  vote: VoteType;
  version: number;
  created_at: string;
  updated_at: string;
};

type ServerState = {
  me: {
    user: {
      user_id: string;
      user_type: string;
      display_name: string | null;
      is_active: boolean;
      version: number;
      created_at: string;
      updated_at: string;
      last_seen_at: string | null;
    };
    session: {
      session_id: string;
      expires_at: string;
      is_secure: boolean;
      cookie_name: string;
    };
  };
  places: PlaceRecord[];
  votes: VoteRecord[];
  nextVoteId: number;
  nextPlaceId: number;
};

function nowIso() {
  return new Date("2026-03-15T10:00:00Z").toISOString();
}

function createInitialState(): ServerState {
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

export async function installAppMocks(page: Page) {
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

    Object.defineProperty(window, "__e2e", {
      configurable: true,
      value: {
        clipboard: [],
        confirms: [],
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __e2e: { clipboard: string[] } }).__e2e.clipboard.push(text);
        },
      },
    });

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    window.confirm = (message: string) => {
      (window as unknown as { __e2e: { confirms: string[] } }).__e2e.confirms.push(message);
      return true;
    };

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
        getCurrentPosition: (success: (value: typeof position) => void) => success(position),
        watchPosition: (success: (value: typeof position) => void) => {
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

export async function readClipboardWrites(page: Page) {
  return page.evaluate(() => (window as unknown as { __e2e: { clipboard: string[] } }).__e2e.clipboard);
}

export async function readConfirmWrites(page: Page) {
  return page.evaluate(() => (window as unknown as { __e2e: { confirms: string[] } }).__e2e.confirms);
}

async function handleApiRoute(route: Route, state: ServerState) {
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
    const payload = request.postDataJSON() as { vote: VoteType };
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
    const payload = request.postDataJSON() as {
      operations: Array<{
        client_operation_id: string;
        entity_type: string;
        entity_id?: string;
        operation_type: string;
        payload: Record<string, unknown>;
      }>;
    };
    const results = payload.operations.map((operation) => applyOutboxOperation(state, operation));
    await json(route, {
      results,
      server_time: nowIso(),
    });
    return;
  }

  if (url.pathname === "/api/v1/auth/logout" && request.method() === "POST") {
    await json(route, { status: "logged_out" });
    return;
  }

  await route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({
      error: { code: "not_found", message: `${request.method()} ${url.pathname}` },
      request_id: "req-unhandled",
    }),
  });
}

function applyOutboxOperation(
  state: ServerState,
  operation: {
    client_operation_id: string;
    entity_type: string;
    entity_id?: string;
    operation_type: string;
    payload: Record<string, unknown>;
  },
) {
  if (operation.entity_type === "place_vote") {
    if (operation.operation_type === "vote_upsert") {
      const vote = upsertVote(state, operation.entity_id || "", String(operation.payload.vote) as VoteType);
      return {
        client_operation_id: operation.client_operation_id,
        status: "applied",
        entity_id: vote.place_vote_id,
      };
    }

    if (operation.operation_type === "vote_delete") {
      const removed = deleteVote(state, operation.entity_id || "");
      return {
        client_operation_id: operation.client_operation_id,
        status: "applied",
        entity_id: removed?.place_vote_id || null,
      };
    }
  }

  if (operation.entity_type === "place" && operation.operation_type === "place_create") {
    const place = createPlace(state, operation.payload);
    return {
      client_operation_id: operation.client_operation_id,
      status: "applied",
      entity_id: place.place_id,
    };
  }

  return {
    client_operation_id: operation.client_operation_id,
    status: "failed",
    error_code: "unsupported",
    error_message: `Unsupported operation: ${operation.operation_type}`,
  };
}

function createPlace(state: ServerState, payload: Record<string, unknown>) {
  const place = {
    place_id: `place-${state.nextPlaceId++}`,
    user_id: state.me.user.user_id,
    venue_type: String(payload.venue_type || "cafe"),
    place_name: String(payload.place_name || "Новая точка"),
    wifi_name: String(payload.wifi_name || "wifi"),
    description: payload.description == null ? null : String(payload.description),
    promo_text: payload.promo_text == null ? null : String(payload.promo_text),
    access_type: String(payload.access_type || "free"),
    status: "active",
    lat: Number(payload.lat || 43.5855),
    lng: Number(payload.lng || 39.7231),
    works_count: 0,
    not_works_count: 0,
    last_verified_at: nowIso(),
    version: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  } satisfies PlaceRecord;
  state.places = [place, ...state.places];
  return place;
}

function upsertVote(state: ServerState, placeId: string, nextVote: VoteType) {
  const place = state.places.find((item) => item.place_id === placeId);
  if (!place) {
    throw new Error(`Unknown place for vote: ${placeId}`);
  }

  const existing = state.votes.find((item) => item.place_id === placeId);
  if (existing) {
    if (existing.vote === "works") {
      place.works_count = Math.max(0, place.works_count - 1);
    } else {
      place.not_works_count = Math.max(0, place.not_works_count - 1);
    }
    existing.vote = nextVote;
    existing.version += 1;
    existing.updated_at = nowIso();
    if (nextVote === "works") {
      place.works_count += 1;
    } else {
      place.not_works_count += 1;
    }
    return existing;
  }

  const vote = {
    place_vote_id: `vote-${state.nextVoteId++}`,
    place_id: placeId,
    user_id: state.me.user.user_id,
    vote: nextVote,
    version: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  } satisfies VoteRecord;

  state.votes = [vote, ...state.votes];
  if (nextVote === "works") {
    place.works_count += 1;
  } else {
    place.not_works_count += 1;
  }
  return vote;
}

function deleteVote(state: ServerState, placeId: string) {
  const place = state.places.find((item) => item.place_id === placeId);
  const existing = state.votes.find((item) => item.place_id === placeId);
  if (!place || !existing) {
    return null;
  }

  if (existing.vote === "works") {
    place.works_count = Math.max(0, place.works_count - 1);
  } else {
    place.not_works_count = Math.max(0, place.not_works_count - 1);
  }
  state.votes = state.votes.filter((item) => item.place_id !== placeId);
  return existing;
}

async function json(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}
