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
  offlineUsageLabel: string;
  offlineActionBusy: boolean;
  onClearOffline: () => void;
};

export function MapPage(props: MapPageProps) {
  const locationButtonLabel = props.locationState.status === "granted" ? "Вы" : "Где я";

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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <button
          type="button"
          onClick={props.onToggleTheme}
          aria-label={props.theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-solid)] text-[var(--app-fg)] transition-transform duration-300 ease-out active:scale-95"
        >
          {props.theme === "dark" ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
        </button>

        <div className="rounded-full border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_92%,transparent)] px-4 py-2 text-sm font-semibold tracking-[0.08em] text-[var(--app-muted)] backdrop-blur">
          Офлайн-карта Wi-Fi
        </div>

        <button
          type="button"
          onClick={props.onClearOffline}
          disabled={props.offlineActionBusy}
          className="pointer-events-auto flex min-h-12 min-w-[8.25rem] flex-col items-start justify-center rounded-[1.15rem] border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_92%,transparent)] px-3 py-2 text-left text-[var(--app-fg)] backdrop-blur transition-transform duration-300 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-muted)]">Очистить офлайн</span>
          <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
            <Trash2 className="h-4 w-4" strokeWidth={2.2} />
            {props.offlineActionBusy ? "Очищаю..." : props.offlineUsageLabel}
          </span>
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
          className={cn(
            "absolute bottom-[9.5rem] right-3 z-50 inline-flex h-14 items-center gap-2 rounded-full border px-4 text-base font-semibold transition-transform duration-300 ease-out active:scale-95",
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
        <div className="absolute inset-x-3 bottom-[11.5rem] z-20 rounded-[1.25rem] border border-amber-400/30 bg-[var(--sheet-bg)] px-4 py-3 text-sm text-[var(--app-fg)]">
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
    <div className="absolute bottom-[8rem] left-3 z-20 w-[min(17rem,calc(100vw-7rem))]">
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
