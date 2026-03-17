import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AboutPage, BottomNav, MapPage, PlaceSheet } from "@/app/App";
import { AccessType, PlaceStatus, SyncStatus, UserType, VenueType, VoteType } from "@/lib/types";

vi.mock("@/features/map/MapCanvas", () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));

const basePlace = {
  place_id: "place-1",
  user_id: "user-1",
  venue_type: VenueType.Cafe,
  place_name: "Surf Coffee",
  wifi_name: "guest_wifi",
  description: "Навагинская, 3",
  promo_text: "Булочки за 140 рублей и кофе",
  access_type: AccessType.Free,
  status: PlaceStatus.Active,
  lat: 43.5855,
  lng: 39.7231,
  works_count: 8,
  not_works_count: 2,
  last_verified_at: "2026-03-15T00:00:00Z",
  version: 1,
  created_at: "2026-03-15T00:00:00Z",
  updated_at: "2026-03-15T00:00:00Z",
  distance_meters: 86,
  direction_degrees: 42,
  local_vote: {
    local_id: "vote-local-1",
    place_id: "place-1",
    user_id: "user-1",
    vote: VoteType.Works,
    server_vote: VoteType.Works,
    version: 1,
    sync_status: SyncStatus.Pending,
    is_deleted: false,
    deleted_at_client: null,
    updated_at_client: "2026-03-15T00:00:00Z",
  },
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MapPage", () => {
  it("shows picker guidance without the old bottom banner wording", async () => {
    const onConfirmPickedLocation = vi.fn();
    const onOpenAbout = vi.fn();

    render(
      <MapPage
        center={{ lat: 43.5855, lng: 39.7231 }}
        loading={false}
        mapPack={null}
        visiblePlaces={[]}
        selectedPlace={null}
        nearestHintPlace={null}
        currentLocation={null}
        locationState={{ status: "prompt", reason: "Нажмите кнопку", lat: 43.5855, lng: 39.7231 }}
        theme="light"
        pickerMapMoving={true}
        addFlow={{
          step: "pick",
          draft: {
            lat: 43.5855,
            lng: 39.7231,
            title: "Морской вокзал, Сочи",
            subtitle: "Сочи",
            isResolving: false,
            error: null,
          },
        }}
        onCenterChange={vi.fn()}
        onPickerMotionChange={vi.fn()}
        onViewportSettled={vi.fn()}
        onEnableLocation={vi.fn()}
        onSelectPlace={vi.fn()}
        onOpenAdd={vi.fn()}
        onConfirmPickedLocation={onConfirmPickedLocation}
        onCancelAdd={vi.fn()}
        onDismissNearestHint={vi.fn()}
        onToggleTheme={vi.fn()}
        onOpenAbout={onOpenAbout}
        offlineUsageLabel="17.8 МБ"
        offlineCacheState="idle"
        offlineActionBusy={false}
        onClearOffline={vi.fn()}
      />,
    );

    expect(await screen.findByTestId("map-canvas")).toBeInTheDocument();
    expect(screen.getByText("Офлайн-карта Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Двигайте карту под Wi-Fi маркер")).toBeInTheDocument();
    expect(screen.queryByText("Поставьте метку")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "О приложении" }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Очистить офлайн/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить Вайфай здесь" }));
    expect(onConfirmPickedLocation).toHaveBeenCalledTimes(1);
  });

  it("renders a closable nearest-place hint instead of auto-opening the sheet", async () => {
    const onDismissNearestHint = vi.fn();
    const onSelectPlace = vi.fn();

    render(
      <MapPage
        center={{ lat: 43.5855, lng: 39.7231 }}
        loading={false}
        mapPack={null}
        visiblePlaces={[basePlace]}
        selectedPlace={null}
        nearestHintPlace={basePlace}
        currentLocation={{ lat: 43.5852, lng: 39.723, accuracy: 14 }}
        locationState={{ status: "granted", lat: 43.5852, lng: 39.723, accuracy: 14 }}
        theme="light"
        pickerMapMoving={false}
        addFlow={null}
        onCenterChange={vi.fn()}
        onPickerMotionChange={vi.fn()}
        onViewportSettled={vi.fn()}
        onEnableLocation={vi.fn()}
        onSelectPlace={onSelectPlace}
        onOpenAdd={vi.fn()}
        onConfirmPickedLocation={vi.fn()}
        onCancelAdd={vi.fn()}
        onDismissNearestHint={onDismissNearestHint}
        onToggleTheme={vi.fn()}
        onOpenAbout={vi.fn()}
        offlineUsageLabel="17.8 МБ"
        offlineCacheState="idle"
        offlineActionBusy={false}
        onClearOffline={vi.fn()}
      />,
    );

    expect(await screen.findByText("Ближе всего")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Surf Coffee"));
    expect(onSelectPlace).toHaveBeenCalledWith(basePlace);
    fireEvent.click(screen.getByRole("button", { name: "Скрыть подсказку" }));
    expect(onDismissNearestHint).toHaveBeenCalledTimes(1);
  });
});

describe("BottomNav", () => {
  it("shows the reduced navigation structure with map, add and activity", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <BottomNav activePath="/about" addActive={false} onOpenAdd={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Карта")).toBeInTheDocument();
    expect(screen.queryByText("О нас")).not.toBeInTheDocument();
    expect(screen.queryByText("Я")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Мои точки/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Добавить Wi-Fi" })).toBeInTheDocument();
  });

  it("keeps the map tab highlighted for place deep links", () => {
    render(
      <MemoryRouter initialEntries={["/place/place-1"]}>
        <BottomNav activePath="/place/place-1" addActive={false} onOpenAdd={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Карта" }).className).toContain("text-brand-500");
  });
});

describe("PlaceSheet", () => {
  it("keeps direction, vote counts and sharing controls visible", () => {
    render(
      <PlaceSheet
        place={basePlace}
        canEdit={true}
        originLabel="от вас"
        onEdit={vi.fn()}
        onVote={vi.fn()}
        onShare={vi.fn()}
        onCopyCoordinates={vi.fn()}
      />,
    );

    expect(screen.getByText("Направление")).toBeInTheDocument();
    expect(screen.getByText("Работает")).toBeInTheDocument();
    expect(screen.getByText("Не работает")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Навагинская, 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поделиться точкой" })).toBeInTheDocument();
    const copyCoordinatesButton = screen.getByRole("button", { name: /Скопировать координаты/i });
    const directionHeading = screen.getByText("Направление");
    const worksButton = screen.getByRole("button", { name: /^Работает/ });
    expect(copyCoordinatesButton).toBeInTheDocument();
    expect(copyCoordinatesButton.compareDocumentPosition(directionHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(directionHeading.compareDocumentPosition(worksButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Добавлено пользователем")).not.toBeInTheDocument();
    expect(screen.queryByText("Поделитесь точкой с друзьями")).not.toBeInTheDocument();
  });
});

describe("AboutPage", () => {
  it("exposes product info and legal links", () => {
    render(
      <MemoryRouter>
        <AboutPage
          me={{
            user: {
              user_id: "user-1",
              user_type: UserType.Anonymous,
              display_name: null,
              is_active: true,
              version: 1,
              created_at: "2026-03-15T00:00:00Z",
              updated_at: "2026-03-15T00:00:00Z",
              last_seen_at: null,
            },
            session: {
              session_id: "session-1",
              cookie_name: "wifiyka_session",
              expires_at: "2026-03-16T00:00:00Z",
              is_secure: true,
            },
          }}
          bindEmail=""
          setBindEmail={vi.fn()}
          bindConsent={false}
          setBindConsent={vi.fn()}
          bindStatus={null}
          onStartBind={vi.fn()}
          loginEmail=""
          setLoginEmail={vi.fn()}
          onStartLogin={vi.fn()}
          onLogout={vi.fn()}
          installState={{ canInstall: false, isIOS: false, isStandalone: false }}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Вайфайка помогает быстро найти живой Wi-Fi рядом/i)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Политика" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Согласие на email" })).toHaveAttribute(
      "href",
      "/consent/personal-data-email",
    );
    expect(screen.getByRole("link", { name: "Открыть API UI" })).toHaveAttribute(
      "href",
      `${window.location.origin}/api-docs.html`,
    );
    expect(screen.getByRole("link", { name: "openapi.yaml" })).toHaveAttribute(
      "href",
      `${window.location.origin}/openapi.yaml`,
    );
  });
});
