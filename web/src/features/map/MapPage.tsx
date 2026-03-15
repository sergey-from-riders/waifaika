import { Cross2Icon, MoonIcon, SewingPinFilledIcon, SunIcon } from "@radix-ui/react-icons";
import { Trash2, Wifi } from "lucide-react";
import { Suspense, lazy } from "react";

import type { AddDraft, AddFlow, DecoratedPlace, UiTheme } from "@/app/ui-models";
import type { MapViewport } from "@/features/map/viewport";
import { type LocationState } from "@/lib/geolocation";
import type { MapPackSource, Place } from "@/lib/types";
import { cn, formatDistance } from "@/lib/utils";

const LazyMapCanvas = lazy(async () => {
  const module = await import("@/features/map/MapCanvas");
  return { default: module.MapCanvas };
});

type MapPageProps = {
  center: { lat: number; lng: number };
  loading: boolean;
  mapPack: MapPackSource | null;
  visiblePlaces: Place[];
  selectedPlace: DecoratedPlace | null;
  nearestHintPlace: DecoratedPlace | null;
  currentLocation: { lat: number; lng: number; accuracy?: number } | null;
  locationState: LocationState;
  theme: UiTheme;
  addFlow: AddFlow;
  pickerMapMoving: boolean;
  onCenterChange: (center: { lat: number; lng: number }) => void;
  onPickerMotionChange: (moving: boolean) => void;
  onViewportSettled: (viewport: MapViewport) => void;
  onEnableLocation: () => void;
  onSelectPlace: (place: Place) => void;
  onOpenAdd: () => void;
  onConfirmPickedLocation: () => void;
  onCancelAdd: () => void;
  onDismissNearestHint: () => void;
  onToggleTheme: () => void;
  onOpenAbout: () => void;
  offlineUsageLabel: string;
  offlineActionBusy: boolean;
  onClearOffline: () => void;
};

export function MapPage(props: MapPageProps) {
  const locationButtonLabel = props.locationState.status === "granted" ? "Вы" : "Где я";
  const floatingBottomStyle = { bottom: "calc(env(safe-area-inset-bottom) + 5.2rem)" };
  const warningBottomStyle = { bottom: "calc(env(safe-area-inset-bottom) + 8.9rem)" };

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-[var(--map-bg)]">
      <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-[var(--map-bg)]" />}>
        <div className="absolute inset-0">
          <LazyMapCanvas
            center={props.center}
            places={props.visiblePlaces}
            activePlaceId={props.selectedPlace?.place_id}
            mapPack={props.mapPack}
            currentLocation={props.currentLocation}
            theme={props.theme}
            pickerMode={props.addFlow?.step === "pick"}
            onCenterChange={props.onCenterChange}
            onMoveStateChange={props.onPickerMotionChange}
            onViewportSettled={props.onViewportSettled}
            onSelectPlace={props.onSelectPlace}
          />
        </div>
      </Suspense>

      {props.addFlow?.step === "pick" ? <CenterPinOverlay draft={props.addFlow.draft} moving={props.pickerMapMoving} /> : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24">
        <button
          type="button"
          onClick={props.onToggleTheme}
          aria-label={props.theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          data-testid="theme-toggle"
          className="pointer-events-auto absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-solid)] text-[var(--app-fg)] transition-transform duration-300 ease-out active:scale-95"
        >
          {props.theme === "dark" ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
        </button>

        <div
          data-testid="map-top-title-group"
          className="pointer-events-auto absolute left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] flex max-w-[calc(100vw-9.75rem)] min-w-0 -translate-x-1/2 items-center"
        >
          <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_92%,transparent)] px-3 py-2 text-[12px] font-semibold tracking-[0.04em] text-[var(--app-muted)] backdrop-blur">
            <span className="min-w-0 truncate">Офлайн-карта Wi-Fi</span>
            <button
              type="button"
              onClick={props.onOpenAbout}
              aria-label="О приложении"
              className="shrink-0 text-[12px] font-bold text-brand-500 transition-opacity duration-300 ease-out active:opacity-70"
            >
              (i)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={props.onClearOffline}
          disabled={props.offlineActionBusy}
          aria-label={props.offlineActionBusy ? "Очистить офлайн" : `Очистить офлайн (${props.offlineUsageLabel})`}
          data-testid="clear-offline-button"
          className="pointer-events-auto absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex h-11 min-w-[4.8rem] items-center justify-center gap-2 rounded-full border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_92%,transparent)] px-3 text-[13px] font-semibold text-[var(--app-fg)] backdrop-blur transition-transform duration-300 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className={cn("h-4 w-4 shrink-0", props.offlineActionBusy ? "animate-pulse" : "")} strokeWidth={2.2} />
          <span>{props.offlineActionBusy ? "..." : props.offlineUsageLabel}</span>
        </button>
      </div>

      {props.nearestHintPlace ? (
        <NearestHintCard
          place={props.nearestHintPlace}
          onOpen={() => {
            if (props.nearestHintPlace) {
              props.onSelectPlace(props.nearestHintPlace);
            }
          }}
          onClose={props.onDismissNearestHint}
        />
      ) : null}

      {props.addFlow?.step !== "pick" ? (
        <button
          type="button"
          onClick={props.onEnableLocation}
          data-testid="location-button"
          style={floatingBottomStyle}
          className={cn(
            "absolute right-3 z-50 inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-transform duration-300 ease-out active:scale-95",
            props.locationState.status === "granted"
              ? "border-emerald-400/35 bg-[var(--panel-solid)] text-[var(--app-fg)]"
              : "border-brand-500 bg-brand-500 text-white",
          )}
        >
          <SewingPinFilledIcon />
          {locationButtonLabel}
        </button>
      ) : null}

      {props.locationState.status === "denied" ? (
        <div
          className="absolute inset-x-3 z-20 rounded-[1.25rem] border border-amber-400/30 bg-[var(--sheet-bg)] px-4 py-3 text-sm text-[var(--app-fg)]"
          style={warningBottomStyle}
        >
          {props.locationState.reason}
        </div>
      ) : null}

      {props.addFlow?.step === "pick" ? (
        <PickerActionBar onCancel={props.onCancelAdd} onConfirm={props.onConfirmPickedLocation} />
      ) : null}
    </section>
  );
}

export function CenterPinOverlay({ draft, moving }: { draft: AddDraft; moving: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-[58%] flex-col items-center">
      <div
        className={cn(
          "center-pin-bob relative transition-transform duration-300 ease-out",
          moving ? "-translate-y-2 scale-[1.04]" : "translate-y-0 scale-100",
        )}
      >
        <div className="flex flex-col items-center">
          <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border border-white/65 bg-[linear-gradient(180deg,#3b82f6,#1d4ed8)] text-white shadow-[0_18px_30px_rgba(37,99,235,0.36)]">
            <Wifi className="h-7 w-7" strokeWidth={2.4} />
          </div>
          <div className="h-[2.9rem] w-[0.3rem] rounded-full bg-[linear-gradient(180deg,rgba(37,99,235,0.95),rgba(37,99,235,0.35))]" />
        </div>
      </div>
      <div className="mt-3 min-w-[16rem] max-w-[20rem] rounded-[1.35rem] border border-[var(--panel-border)] bg-[var(--sheet-bg)] px-4 py-3 text-center text-sm text-[var(--app-fg)]">
        <p className="text-base font-semibold">Двигайте карту под Wi-Fi маркер</p>
        <p className="mt-1 text-[var(--app-muted)]">{draft.isResolving ? "Определяю адрес..." : draft.title}</p>
        {!draft.isResolving ? <p className="mt-1 text-[var(--app-muted)]">{draft.subtitle}</p> : null}
        {draft.error ? <p className="mt-2 text-amber-500">{draft.error}</p> : null}
      </div>
    </div>
  );
}

function PickerActionBar({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 mx-auto flex max-w-[28rem] items-center gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="glass-panel inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--app-fg)] transition-transform duration-300 ease-out active:scale-95"
      >
        <Cross2Icon />
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="inline-flex h-14 flex-1 items-center justify-center rounded-[1.2rem] bg-brand-500 px-5 text-lg font-semibold text-white transition-transform duration-300 ease-out active:scale-[0.98]"
      >
        Добавить Вайфай здесь
      </button>
    </div>
  );
}

export function NearestHintCard({
  place,
  onOpen,
  onClose,
}: {
  place: DecoratedPlace;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="nearest-hint-card"
      className="absolute left-3 z-20 w-[min(12rem,calc(100vw-8rem))]"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.2rem)" }}
    >
      <div className="glass-panel rounded-[1.5rem] border border-[var(--panel-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left transition-opacity duration-300 ease-out active:opacity-70"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">Ближе всего</p>
            <p className="mt-1 truncate text-lg font-semibold">{place.place_name}</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{formatDistance(place.distance_meters)}</p>
          </button>
          <button
            type="button"
            aria-label="Скрыть подсказку"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--panel-muted)] text-[var(--app-fg)] transition-transform duration-300 ease-out active:scale-95"
          >
            <Cross2Icon />
          </button>
        </div>
      </div>
    </div>
  );
}
