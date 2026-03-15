import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import {
  applyLocalVoteOverlay,
  locationToCenter,
  mergePlaces,
  mergeVotes,
  toLocalPlace,
  toLocalVoteEntry,
} from "@/app/place-sync";
import type { AddFlow, DecoratedPlace, Toast, UiTheme } from "@/app/ui-models";
import { BottomNav } from "@/components/BottomNav";
import { BottomSheet } from "@/components/BottomSheet";
import { ToastBanner } from "@/components/ToastBanner";
import { db } from "@/db/app-db";
import { buildLocalPlace, buildLocalVote, makeOutboxRecord } from "@/db/outbox";
import { MapPage } from "@/features/map/MapPage";
import { type MapViewport, viewportRequestKey, viewportRadiusKm } from "@/features/map/viewport";
import { PlaceForm } from "@/features/places/PlaceForm";
import { PlaceSheet } from "@/features/places/PlaceSheet";
import {
  readLocationPermissionState,
  requestDeviceLocation,
  startLocationWatch,
  stopLocationWatch,
  type LocationState,
  SOCHI_CENTER,
} from "@/lib/geolocation";
import { api } from "@/lib/api";
import { reverseGeocode, searchGeocode } from "@/lib/nominatim";
import {
  clearOfflineCaches,
  DATA_CACHE_NAME,
  formatStorageUsage,
  MANUAL_PACK_CACHE_NAME,
  readOfflineUsageBytes,
} from "@/lib/offline-cache";
import { boundsContainLocation, enrichRegionsWithBounds, pickRegionForCenter, readPackBoundsFromFile } from "@/lib/offline-packs";
import {
  mergeRegionRecords,
  requestPersistentStorage,
  restorePlacesFromRegionRecords,
  toRegionPlaceRecords,
  toRegionRecord,
  upsertRegionRecord,
} from "@/lib/offline";
import { requestOrientationAccess, startCompassWatch } from "@/lib/orientation";
import { getInstallState, registerServiceWorker, subscribeInstallPrompt } from "@/lib/pwa";
import type {
  LocalPlace,
  LocalVote,
  MapPackSource,
  MeResponse,
  OfflinePack,
  Place,
  PlaceInput,
  PlacePatch,
  RegionRecord,
  SyncStatus,
  VoteType,
} from "@/lib/types";
import {
  PlaceStatus as PlaceStatusEnum,
  SyncStatus as SyncStatusEnum,
  VoteType as VoteTypeEnum,
} from "@/lib/types";
import { bearingDegrees, cn, distanceBetweenMeters, normalizeDegrees } from "@/lib/utils";
import { ActivityPage, AboutPage, PlainPage } from "@/pages/AppPages";
import { ConsentPage } from "@/pages/ConsentPage";
import { PrivacyPage } from "@/pages/PrivacyPage";

const MAP_RADIUS_KM = 100;
const NEARBY_HINT_DISMISSED_KEY = "wifiyka-nearest-hint-dismissed";
type ThemePreference = UiTheme | "system";
type OfflineCacheIndicatorState = "idle" | "caching" | "cached" | "error";

export { AboutPage, BottomNav, MapPage, PlaceSheet };

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [myPlaces, setMyPlaces] = useState<LocalPlace[]>([]);
  const [myVotes, setMyVotes] = useState<LocalVote[]>([]);
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [mapPack, setMapPack] = useState<MapPackSource | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
  const [center, setCenter] = useState(SOCHI_CENTER);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncStatus | "idle" | "syncing">("idle");
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [bindEmail, setBindEmail] = useState("");
  const [bindConsent, setBindConsent] = useState(false);
  const [bindStatus, setBindStatus] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [installTick, setInstallTick] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [offlineUsageBytes, setOfflineUsageBytes] = useState(0);
  const [offlineCacheState, setOfflineCacheState] = useState<OfflineCacheIndicatorState>("idle");
  const [clearingOffline, setClearingOffline] = useState(false);
  const [addressSearchBusy, setAddressSearchBusy] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const saved = window.localStorage.getItem("wifiyka-theme-preference");
    return saved === "light" || saved === "dark" ? saved : "system";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false,
  );
  const [addFlow, setAddFlow] = useState<AddFlow>(null);
  const [pickerMapMoving, setPickerMapMoving] = useState(false);
  const [nearestHintDismissed, setNearestHintDismissed] = useState(() =>
    typeof window !== "undefined" ? window.sessionStorage.getItem(NEARBY_HINT_DISMISSED_KEY) === "1" : false,
  );
  const installState = useMemo(() => getInstallState(), [installTick]);
  const locationWatchRef = useRef<number | null>(null);
  const compassStopRef = useRef<(() => void) | null>(null);
  const compassPendingRef = useRef<Promise<boolean> | null>(null);
  const compassActiveRef = useRef(false);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeSearchAbortRef = useRef<AbortController | null>(null);
  const offlineWarmRef = useRef<number | null>(null);
  const offlineIndicatorTimeoutRef = useRef<number | null>(null);
  const offlineCacheOpsRef = useRef(0);
  const sharedPlaceFetchRef = useRef<string | null>(null);
  const viewportCoverageRef = useRef<string | null>(null);
  const theme = themePreference === "system" ? (systemPrefersDark ? "dark" : "light") : themePreference;
  const routePlaceId = useMemo(() => {
    if (!location.pathname.startsWith("/place/")) {
      return null;
    }
    const raw = location.pathname.slice("/place/".length).split("/")[0];
    return raw ? decodeURIComponent(raw) : null;
  }, [location.pathname]);
  const sharedPlaceId = useMemo(() => routePlaceId || new URLSearchParams(location.search).get("place"), [location.search, routePlaceId]);
  const isMapRoute = location.pathname === "/" || location.pathname.startsWith("/place/");

  const currentLocation =
    locationState.status === "granted"
      ? { lat: locationState.lat, lng: locationState.lng, accuracy: locationState.accuracy }
      : null;
  const localVoteLookup = useMemo(() => {
    return new Map(myVotes.map((item) => [item.place_id, item]));
  }, [myVotes]);

  async function resolveMapPack(
    nextRegions: RegionRecord[],
    targetCenter = center,
    preferredPackId?: string | null,
  ) {
    const primary = pickRegionForCenter(nextRegions, targetCenter, preferredPackId);
    if (!primary) {
      setMapPack(null);
      return;
    }

    if ("caches" in window && primary.cache_status === "cached") {
      const cache = await caches.open(MANUAL_PACK_CACHE_NAME);
      const cached = await cache.match(primary.url);
      if (cached) {
        setMapPack(packBlobToSource(primary, await cached.blob()));
        return;
      }
    }

    setMapPack({
      kind: "remote",
      key: `remote:${primary.pack_id}:${primary.version_hash}`,
      label: primary.region_name,
      url: new URL(primary.url, window.location.origin).toString(),
    });
  }

  async function restoreNearbyFromCache(nextRegions: RegionRecord[], targetCenter = center) {
    const containingPackIds = nextRegions
      .filter((item) => boundsContainLocation(item.bounds, targetCenter))
      .map((item) => item.pack_id);
    const fallbackPackId = pickRegionForCenter(nextRegions, targetCenter)?.pack_id;
    const packIds =
      containingPackIds.length > 0 ? containingPackIds : fallbackPackId ? [fallbackPackId] : nextRegions.map((item) => item.pack_id);

    if (packIds.length > 0) {
      const regionSnapshots = await db.region_places.where("pack_id").anyOf(packIds).toArray();
      const restored = restorePlacesFromRegionRecords(regionSnapshots);
      if (restored.length > 0) {
        return restored;
      }
    }

    const cachedNearby = await db.app_state.get("nearby_places");
    if (Array.isArray(cachedNearby?.value)) {
      return cachedNearby.value as Place[];
    }
    return [];
  }

  async function persistNearbySnapshot(packs: OfflinePack[], places: Place[]) {
    await db.app_state.put({ key: "nearby_places", value: places });
    if (packs.length === 0) {
      return;
    }

    const records = toRegionPlaceRecords(packs, places);
    if (records.length > 0) {
      await db.region_places.bulkPut(records);
    }
  }

  async function applyOfflinePacks(packs: OfflinePack[], targetCenter = center): Promise<RegionRecord[]> {
    const current = await db.regions.toArray();
    const merged = packs.length > 0 ? mergeRegionRecords(current, packs) : current;
    const enriched = await enrichRegionsWithBounds(merged);
    setRegions(enriched);
    await db.regions.bulkPut(enriched);
    await resolveMapPack(enriched, targetCenter, packs[0]?.pack_id);
    return enriched;
  }

  async function cacheMissingPacks(packs: OfflinePack[], nextRegions: RegionRecord[], targetCenter = center) {
    const activeRegion = pickRegionForCenter(nextRegions, targetCenter, packs[0]?.pack_id);
    let allCached = true;
    for (const pack of packs) {
      const cached = nextRegions.find((item) => item.pack_id === pack.pack_id && item.cache_status === "cached");
      if (!cached) {
        const success = await downloadPack(pack, activeRegion?.pack_id === pack.pack_id);
        allCached = allCached && success;
      }
    }
    return allCached;
  }

  async function applyCoveragePayload(packs: OfflinePack[], places: Place[], targetCenter = center) {
    const finishCaching = beginOfflineCaching();
    try {
      setNearbyPlaces(places);
      await db.app_state.put({ key: "nearby_places", value: places });
      const nextRegions = await applyOfflinePacks(packs, targetCenter);
      await persistNearbySnapshot(packs, places);
      const packsCached = await cacheMissingPacks(packs, nextRegions, targetCenter);
      void requestPersistentStorage();
      await refreshOfflineUsage();
      finishCaching(packsCached ? "cached" : "error");
      return nextRegions;
    } catch (error) {
      finishCaching("error");
      throw error;
    }
  }

  async function restoreViewportFromCache(targetCenter = center) {
    const cachedRegions = await enrichRegionsWithBounds(await db.regions.toArray());
    setRegions(cachedRegions);
    await db.regions.bulkPut(cachedRegions);
    await resolveMapPack(cachedRegions, targetCenter);
    const restored = await restoreNearbyFromCache(cachedRegions, targetCenter);
    setNearbyPlaces(restored);
    await db.app_state.put({ key: "nearby_places", value: restored });
    await refreshOfflineUsage();
  }

  async function persistCenter(nextCenter: { lat: number; lng: number }) {
    setCenter(nextCenter);
    await db.app_state.put({ key: "last_center", value: nextCenter });
  }

  async function seedCachedMe(nextMe: MeResponse) {
    if (!("caches" in window)) {
      return;
    }
    const cache = await caches.open(DATA_CACHE_NAME);
    await cache.put(
      "/api/v1/me",
      new Response(JSON.stringify(nextMe), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    );
  }

  async function refreshOfflineUsage() {
    try {
      setOfflineUsageBytes(await readOfflineUsageBytes());
    } catch (error) {
      console.error(error);
    }
  }

  function beginOfflineCaching() {
    offlineCacheOpsRef.current += 1;
    if (offlineIndicatorTimeoutRef.current != null) {
      window.clearTimeout(offlineIndicatorTimeoutRef.current);
      offlineIndicatorTimeoutRef.current = null;
    }
    setOfflineCacheState("caching");

    return (nextState: Exclude<OfflineCacheIndicatorState, "caching"> = "cached") => {
      offlineCacheOpsRef.current = Math.max(0, offlineCacheOpsRef.current - 1);
      if (offlineCacheOpsRef.current > 0) {
        return;
      }
      setOfflineCacheState(nextState);
      offlineIndicatorTimeoutRef.current = window.setTimeout(() => {
        setOfflineCacheState("idle");
        offlineIndicatorTimeoutRef.current = null;
      }, nextState === "error" ? 2600 : 1600);
    };
  }

  const visiblePlaces = useMemo(() => {
    const localShadowPlaces: Place[] = myPlaces
      .filter((item) => !item.is_deleted)
      .map((item) => ({
        place_id: item.place_id ?? item.local_id,
        user_id: item.user_id,
        venue_type: item.venue_type,
        place_name: item.place_name,
        wifi_name: item.wifi_name,
        description: item.description,
        promo_text: item.promo_text,
        access_type: item.access_type,
        status: PlaceStatusEnum.Active,
        lat: item.lat,
        lng: item.lng,
        works_count: 0,
        not_works_count: 0,
        version: item.version,
        created_at: item.updated_at_client,
        updated_at: item.updated_at_client,
        sync_status: item.sync_status,
        sync_error: item.sync_error,
      }));
    const map = new Map<string, Place>();
    for (const place of nearbyPlaces) {
      map.set(place.place_id, applyLocalVoteOverlay(place, localVoteLookup.get(place.place_id)));
    }
    for (const place of localShadowPlaces) {
      map.set(place.place_id, applyLocalVoteOverlay(place, localVoteLookup.get(place.place_id)));
    }
    return Array.from(map.values());
  }, [localVoteLookup, myPlaces, nearbyPlaces]);

  const visiblePlaceLookup = useMemo(() => {
    return new Map(visiblePlaces.map((item) => [item.place_id, item]));
  }, [visiblePlaces]);

  const selectedPlace = useMemo<DecoratedPlace | null>(() => {
    const place = visiblePlaces.find((item) => item.place_id === selectedPlaceId);
    if (!place) {
      return null;
    }
    const origin =
      locationState.status === "granted"
        ? { lat: locationState.lat, lng: locationState.lng }
        : center;
    const localVote = localVoteLookup.get(place.place_id);
    const bearing = bearingDegrees(origin, place);
    return {
      ...place,
      distance_meters: distanceBetweenMeters(origin, place),
      direction_degrees: deviceHeading == null ? bearing : normalizeDegrees(bearing - deviceHeading),
      local_vote: localVote && !localVote.is_deleted ? localVote : null,
    };
  }, [center, deviceHeading, localVoteLookup, locationState, selectedPlaceId, visiblePlaces]);

  const editablePlaceLocalId = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }
    return myPlaces.find((item) => (item.place_id ?? item.local_id) === selectedPlace.place_id)?.local_id ?? null;
  }, [myPlaces, selectedPlace]);

  const nearestHintPlace = useMemo<DecoratedPlace | null>(() => {
    if (visiblePlaces.length === 0) {
      return null;
    }
    const origin =
      locationState.status === "granted"
        ? { lat: locationState.lat, lng: locationState.lng }
        : center;
    const nearest = visiblePlaces.reduce<Place | null>((closest, place) => {
      if (!closest) {
        return place;
      }
      return distanceBetweenMeters(origin, place) < distanceBetweenMeters(origin, closest) ? place : closest;
    }, null);
    if (!nearest) {
      return null;
    }
    const localVote = localVoteLookup.get(nearest.place_id);
    const bearing = bearingDegrees(origin, nearest);
    return {
      ...nearest,
      distance_meters: distanceBetweenMeters(origin, nearest),
      direction_degrees: deviceHeading == null ? bearing : normalizeDegrees(bearing - deviceHeading),
      local_vote: localVote && !localVote.is_deleted ? localVote : null,
    };
  }, [center, deviceHeading, localVoteLookup, locationState, visiblePlaces]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("wifiyka-theme-preference", themePreference);
  }, [theme, themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    registerServiceWorker();
    const unsubscribeInstall = subscribeInstallPrompt(() => setInstallTick((value) => value + 1));
    void initialize();

    const onOnline = () => {
      void syncNow();
      void refreshOfflineUsage();
    };
    const onFocus = () => {
      void syncNow();
      void refreshOfflineUsage();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribeInstall();
      stopLocationWatch(locationWatchRef.current);
      compassStopRef.current?.();
      compassActiveRef.current = false;
      compassPendingRef.current = null;
      geocodeAbortRef.current?.abort();
      geocodeSearchAbortRef.current?.abort();
      if (offlineIndicatorTimeoutRef.current != null) {
        window.clearTimeout(offlineIndicatorTimeoutRef.current);
      }
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.DeviceOrientationEvent === "undefined") {
      return;
    }

    const OrientationCtor = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    });

    if (typeof OrientationCtor.requestPermission !== "function") {
      void ensureCompassTracking();
      return;
    }

    const armCompass = () => {
      void ensureCompassTracking().then((granted) => {
        if (granted) {
          cleanupInteractionHandlers();
        }
      });
    };

    const cleanupInteractionHandlers = () => {
      window.removeEventListener("pointerdown", armCompass, true);
      window.removeEventListener("touchstart", armCompass, true);
      window.removeEventListener("click", armCompass, true);
      window.removeEventListener("keydown", armCompass, true);
    };

    window.addEventListener("pointerdown", armCompass, true);
    window.addEventListener("touchstart", armCompass, true);
    window.addEventListener("click", armCompass, true);
    window.addEventListener("keydown", armCompass, true);
    return cleanupInteractionHandlers;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!isMapRoute) {
      return;
    }
    if (sharedPlaceId) {
      if (visiblePlaceLookup.has(sharedPlaceId)) {
        setSelectedPlaceId(sharedPlaceId);
        return;
      }
      if (navigator.onLine && sharedPlaceFetchRef.current !== sharedPlaceId) {
        sharedPlaceFetchRef.current = sharedPlaceId;
        void api
          .getPlace(sharedPlaceId)
          .then((place) => {
            setNearbyPlaces((current) => {
              const filtered = current.filter((item) => item.place_id !== place.place_id);
              return [place, ...filtered];
            });
            setSelectedPlaceId(place.place_id);
          })
          .catch(() => {
            setToast({ tone: "error", message: "Точку из ссылки не удалось загрузить" });
          });
      }
      return;
    }
    sharedPlaceFetchRef.current = null;
    if (!addFlow) {
      setSelectedPlaceId(null);
    }
  }, [addFlow, isMapRoute, sharedPlaceId, visiblePlaceLookup]);

  useEffect(() => {
    if (isMapRoute) {
      return;
    }
    setSelectedPlaceId(null);
    setAddFlow(null);
    setEditingLocalId(null);
  }, [isMapRoute]);

  useEffect(() => {
    if (addFlow?.step !== "pick") {
      geocodeAbortRef.current?.abort();
      return;
    }
    const timeout = window.setTimeout(() => {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      void reverseGeocode(addFlow.draft.lat, addFlow.draft.lng, controller.signal)
        .then((resolved) => {
          setAddFlow((current) =>
            current?.step === "pick" || current?.step === "form"
              ? {
                  ...current,
                  draft: {
                    ...current.draft,
                    title: resolved.title,
                    subtitle: resolved.subtitle,
                    isResolving: false,
                    error: null,
                  },
                }
              : current,
          );
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") {
            return;
          }
          setAddFlow((current) =>
            current?.step === "pick" || current?.step === "form"
              ? {
                  ...current,
                  draft: {
                    ...current.draft,
                    isResolving: false,
                    error: "Адрес пока не определился",
                  },
                }
              : current,
          );
        });
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [addFlow?.draft.lat, addFlow?.draft.lng, addFlow?.step]);

  async function initialize() {
    setLoading(true);
    try {
      const cached = await Promise.all([
        db.my_places.toArray(),
        db.my_votes.toArray(),
        db.regions.toArray(),
        db.app_state.get("nearby_places"),
        db.app_state.get("me"),
        db.app_state.get("last_center"),
      ]);
      const bootCenter =
        cached[5]?.value && typeof cached[5].value === "object"
          ? (cached[5].value as { lat: number; lng: number })
          : SOCHI_CENTER;
      const cachedRegions = await enrichRegionsWithBounds(cached[2]);
      setMyPlaces(cached[0]);
      setMyVotes(cached[1]);
      setRegions(cachedRegions);
      await db.regions.bulkPut(cachedRegions);
      await resolveMapPack(cachedRegions, bootCenter);
      await refreshOfflineUsage();
      const cachedNearby = await restoreNearbyFromCache(cachedRegions, bootCenter);
      if (cachedNearby.length > 0) {
        setNearbyPlaces(cachedNearby);
      } else if (Array.isArray(cached[3]?.value)) {
        setNearbyPlaces(cached[3].value as Place[]);
      }
      if (cached[4]?.value) {
        setMe(cached[4].value as MeResponse);
      }
      if (cached[5]?.value && typeof cached[5].value === "object") {
        setCenter(cached[5].value as { lat: number; lng: number });
      }

      let bootMe = cached[4]?.value ? (cached[4].value as MeResponse) : null;
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const purpose = params.get("purpose");
      const isOnline = navigator.onLine;
      let canRefreshBootstrap = false;
      if (isOnline) {
        try {
          if (bootMe) {
            try {
              bootMe = await api.getMe();
            } catch (error) {
              const apiError = error as Error & { payload?: { error?: { code?: string } } };
              if (apiError.payload?.error?.code === "unauthorized") {
                bootMe = await api.bootstrapSession();
              } else {
                throw error;
              }
            }
          } else {
            bootMe = await api.bootstrapSession();
          }
          if (token && purpose === "bind_email") {
            bootMe = await api.confirmBindEmail(token);
            setToast({ tone: "success", message: "Почта привязана" });
            window.history.replaceState({}, "", "/about");
            navigate("/about", { replace: true });
          }
          if (token && purpose === "login") {
            bootMe = await api.confirmLogin(token);
            setToast({ tone: "success", message: "Вход подтверждён" });
            window.history.replaceState({}, "", "/about");
            navigate("/about", { replace: true });
          }
          if (bootMe) {
            setMe(bootMe);
            await db.app_state.put({ key: "me", value: bootMe });
            await seedCachedMe(bootMe);
          }
          canRefreshBootstrap = true;
        } catch (error) {
          if (!bootMe) {
            throw error;
          }
          setSyncState(SyncStatusEnum.Pending);
        }
      }

      let nextCenter = bootCenter;
      const permission = await readLocationPermissionState();
      if (permission === "granted") {
        setLocationState({ status: "pending" });
        const geo = await requestDeviceLocation("auto");
        nextCenter = locationToCenter(geo);
        setLocationState(geo);
        await persistCenter(nextCenter);
        if (geo.status === "granted") {
          startLiveLocationWatch();
        }
      } else if (permission === "denied") {
        setLocationState({
          status: "denied",
          reason: "Геопозиция заблокирована. Включите доступ к локации в браузере",
          ...bootCenter,
        });
      } else {
        setLocationState({
          status: "prompt",
          reason: "Нажмите «Где я», чтобы показать системный запрос",
          ...bootCenter,
        });
      }

      if (canRefreshBootstrap) {
        await refreshBootstrap(nextCenter);
      } else {
        setSyncState(SyncStatusEnum.Pending);
        void requestPersistentStorage();
      }
    } catch (error) {
      console.error(error);
      setToast({ tone: "error", message: "Показываю кэш, сервер сейчас недоступен" });
    } finally {
      setLoading(false);
    }
  }

  async function refreshBootstrap(nextCenter = center) {
    try {
      const payload = await api.syncBootstrap(nextCenter.lat, nextCenter.lng, MAP_RADIUS_KM);
      setMe(payload.me);
      const syncedPlaces = payload.my_places.map(toLocalPlace);
      const syncedVotes = payload.my_votes.map(toLocalVoteEntry);
      setMyPlaces((current) => mergePlaces(current, syncedPlaces));
      setMyVotes((current) => mergeVotes(current, syncedVotes));
      await db.my_places.bulkPut(mergePlaces(await db.my_places.toArray(), syncedPlaces));
      await db.my_votes.bulkPut(mergeVotes(await db.my_votes.toArray(), syncedVotes));
      await db.app_state.put({ key: "me", value: payload.me });
      await applyCoveragePayload(payload.offline_packs, payload.nearby_places, nextCenter);
      viewportCoverageRef.current = null;
      setSyncState(SyncStatusEnum.Synced);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshViewportCoverage(viewport: MapViewport) {
    const requestKey = viewportRequestKey(viewport);
    if (viewportCoverageRef.current === requestKey) {
      return;
    }

    if (!navigator.onLine) {
      viewportCoverageRef.current = requestKey;
      await restoreViewportFromCache(viewport.center);
      return;
    }

    try {
      const payload = await api.syncBootstrap(viewport.center.lat, viewport.center.lng, viewportRadiusKm(viewport));
      await applyCoveragePayload(payload.offline_packs, payload.nearby_places, viewport.center);
      viewportCoverageRef.current = requestKey;
    } catch (error) {
      console.error(error);
      viewportCoverageRef.current = null;
      await restoreViewportFromCache(viewport.center);
    }
  }

  async function downloadPack(pack: OfflinePack, activate = false) {
    try {
      const response = await fetch(pack.url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`pack download failed: ${response.status}`);
      }
      const blob = await response.clone().blob();
      const source = packBlobToSource(pack, blob);
      const previous = await db.regions.get(pack.pack_id);
      const bounds =
        previous?.bounds ??
        (source.kind === "file" ? await readPackBoundsFromFile(source.file).catch(() => null) : null);
      if ("caches" in window) {
        const cache = await caches.open(MANUAL_PACK_CACHE_NAME);
        await cache.put(pack.url, response.clone());
      }
      const region = {
        ...toRegionRecord(pack),
        downloaded_at: new Date().toISOString(),
        cache_status: "cached" as const,
        bounds,
      };
      await db.regions.put(region);
      setRegions((current) => upsertRegionRecord(current, region));
      setMapPack((current) => {
        if (!activate && current && !current.key.includes(`:${pack.pack_id}:${pack.version_hash}`)) {
          return current;
        }
        return source;
      });
      await refreshOfflineUsage();
      return true;
    } catch {
      const previous = await db.regions.get(pack.pack_id);
      const region = {
        ...toRegionRecord(pack),
        cache_status: "failed" as const,
        bounds: previous?.bounds ?? null,
      };
      await db.regions.put(region);
      setRegions((current) => upsertRegionRecord(current, region));
      return false;
    }
  }

  async function enableLocation() {
    if (locationState.status === "granted") {
      await persistCenter({ lat: locationState.lat, lng: locationState.lng });
      await refreshBootstrap({ lat: locationState.lat, lng: locationState.lng });
      return;
    }

    await ensureCompassTracking();

    setLocationState({ status: "pending" });
    const geo = await requestDeviceLocation("user");
    const nextCenter = locationToCenter(geo);
    setLocationState(geo);
    await persistCenter(nextCenter);
    if (geo.status === "granted") {
      startLiveLocationWatch();
      await refreshBootstrap(nextCenter);
      return;
    }
    if (geo.status === "prompt") {
      setToast({ tone: "info", message: "Браузер ждёт системный ответ по геопозиции" });
    } else if (geo.status === "denied") {
      setToast({ tone: "info", message: "Доступ к геопозиции заблокирован в браузере" });
    }
  }

  async function searchAddressForDraft(query: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !addFlow) {
      return;
    }

    geocodeSearchAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeSearchAbortRef.current = controller;
    setAddressSearchBusy(true);
    setAddressSearchError(null);

    try {
      const [match] = await searchGeocode(normalizedQuery, controller.signal);
      if (!match) {
        setAddressSearchError("Nominatim не нашёл такой адрес");
        return;
      }

      const nextCenter = { lat: match.lat, lng: match.lng };
      await persistCenter(nextCenter);
      setPickerMapMoving(false);
      setAddFlow((current) =>
        current
          ? {
              ...current,
              draft: {
                ...current.draft,
                lat: match.lat,
                lng: match.lng,
                title: match.title,
                subtitle: match.subtitle,
                isResolving: false,
                error: null,
              },
            }
          : current,
      );
      setToast({ tone: "success", message: "Точку переместил к найденному адресу" });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
      console.error(error);
      setAddressSearchError("Поиск адреса временно не ответил");
      setToast({ tone: "error", message: "Не удалось найти адрес через Nominatim" });
    } finally {
      if (geocodeSearchAbortRef.current === controller) {
        geocodeSearchAbortRef.current = null;
      }
      setAddressSearchBusy(false);
    }
  }

  async function ensureCompassTracking() {
    if (compassActiveRef.current) {
      return true;
    }
    if (compassPendingRef.current) {
      return compassPendingRef.current;
    }

    const pending = requestOrientationAccess()
      .then((compass) => {
        if (compass.status !== "granted") {
          compassActiveRef.current = false;
          setDeviceHeading(null);
          return false;
        }

        compassStopRef.current?.();
        compassStopRef.current = startCompassWatch((heading) => setDeviceHeading(heading));
        compassActiveRef.current = true;
        return true;
      })
      .finally(() => {
        compassPendingRef.current = null;
      });

    compassPendingRef.current = pending;
    return pending;
  }

  function startLiveLocationWatch() {
    stopLocationWatch(locationWatchRef.current);
    locationWatchRef.current = startLocationWatch(
      (nextLocation) => {
        setLocationState(nextLocation);
      },
      (nextLocation) => {
        setLocationState(nextLocation);
      },
    );
  }

  async function syncNow(message?: string) {
    if (!navigator.onLine || !me) {
      setSyncState(SyncStatusEnum.Pending);
      return;
    }
    setSyncState("syncing");
    try {
      const outbox = await db.outbox.filter((item) => item.status === "pending" || item.status === "failed").sortBy("created_at");
      if (outbox.length > 0) {
        const response = await api.syncOutbox(
          outbox.map((item) => ({
            client_operation_id: item.client_operation_id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            operation_type: item.operation_type,
            payload: item.payload,
          })),
        );

        for (const result of response.results) {
          const outboxRecord = outbox.find((item) => item.client_operation_id === result.client_operation_id);
          if (!outboxRecord) {
            continue;
          }
          if (result.status === "applied") {
            await db.outbox.delete(outboxRecord.client_operation_id);
            if (outboxRecord.entity_type === "place") {
              const local = await db.my_places.get(outboxRecord.entity_local_id);
              if (local) {
                local.sync_status = SyncStatusEnum.Synced;
                local.sync_error = null;
                local.last_synced_at = new Date().toISOString();
                local.place_id = result.entity_id ?? local.place_id;
                await db.my_places.put(local);
              }
            }
            if (outboxRecord.entity_type === "place_vote") {
              const localVote = await db.my_votes.get(outboxRecord.entity_local_id);
              if (localVote) {
                if (outboxRecord.operation_type === "vote_delete") {
                  await db.my_votes.delete(outboxRecord.entity_local_id);
                } else {
                  localVote.sync_status = SyncStatusEnum.Synced;
                  localVote.sync_error = null;
                  localVote.is_deleted = false;
                  localVote.deleted_at_client = null;
                  localVote.server_vote = localVote.vote;
                  localVote.place_vote_id = result.entity_id ?? localVote.place_vote_id;
                  localVote.last_synced_at = new Date().toISOString();
                  await db.my_votes.put(localVote);
                }
              }
            }
          } else {
            await db.outbox.put({
              ...outboxRecord,
              status: result.status,
              last_error: result.error_message ?? null,
              retry_count: outboxRecord.retry_count + 1,
            });
            if (outboxRecord.entity_type === "place") {
              const local = await db.my_places.get(outboxRecord.entity_local_id);
              if (local) {
                local.sync_status = result.status === "conflict" ? SyncStatusEnum.Conflict : SyncStatusEnum.Failed;
                local.sync_error = result.error_message ?? null;
                await db.my_places.put(local);
              }
            }
            if (outboxRecord.entity_type === "place_vote") {
              const localVote = await db.my_votes.get(outboxRecord.entity_local_id);
              if (localVote) {
                localVote.sync_status = result.status === "conflict" ? SyncStatusEnum.Conflict : SyncStatusEnum.Failed;
                localVote.sync_error = result.error_message ?? null;
                await db.my_votes.put(localVote);
              }
            }
          }
        }
      }

      await refreshBootstrap(center);
      setMyPlaces(await db.my_places.toArray());
      setMyVotes(await db.my_votes.toArray());
      setSyncState(SyncStatusEnum.Synced);
      if (message) {
        setToast({ tone: "success", message });
      }
    } catch (error) {
      console.error(error);
      setSyncState(SyncStatusEnum.Failed);
      setToast({ tone: "error", message: "Синхронизация не удалась, изменения не потерялись" });
    }
  }

  async function submitPlace(input: PlaceInput) {
    if (!me) {
      return;
    }
    const editing = editingLocalId ? myPlaces.find((item) => item.local_id === editingLocalId) : null;
    if (editing && editing.place_id) {
      const patch: PlacePatch = {
        venue_type: input.venue_type,
        place_name: input.place_name,
        wifi_name: input.wifi_name,
        description: input.description,
        promo_text: input.promo_text,
        access_type: input.access_type,
        lat: input.lat,
        lng: input.lng,
        version: editing.version,
      };
      const next: LocalPlace = {
        ...editing,
        ...input,
        version: editing.version,
        sync_status: SyncStatusEnum.Pending,
        sync_error: null,
        updated_at_client: new Date().toISOString(),
      };
      await db.my_places.put(next);
      await db.outbox.put(makeOutboxRecord("place", editing.local_id, "place_update", patch, editing.place_id));
      setMyPlaces((current) => current.map((item) => (item.local_id === editing.local_id ? next : item)));
    } else {
      const local = buildLocalPlace(me.user.user_id, input);
      await db.my_places.put(local);
      await db.outbox.put(makeOutboxRecord("place", local.local_id, "place_create", input));
      setMyPlaces((current) => [local, ...current]);
    }
    setAddFlow(null);
    setEditingLocalId(null);
    setToast({ tone: "success", message: "Точка сохранена" });
    if (navigator.onLine) {
      await syncNow();
    }
  }

  async function voteForPlace(placeId: string, vote: VoteType) {
    if (!me) {
      return;
    }
    const existing = myVotes.find((item) => item.place_id === placeId);
    const timestamp = new Date().toISOString();
    const baselineVote = existing?.server_vote ?? null;

    if (existing && !existing.is_deleted && existing.vote === vote && baselineVote == null) {
      await removeVoteLocally(existing.local_id);
      setMyVotes((current) => current.filter((item) => item.place_id !== placeId));
      setToast({ tone: "info", message: "Голос снят" });
      return;
    }

    const next =
      existing && !existing.is_deleted && existing.vote === vote
        ? {
            ...existing,
            is_deleted: true,
            deleted_at_client: timestamp,
            sync_status: SyncStatusEnum.Pending,
            sync_error: null,
            updated_at_client: timestamp,
          }
        : existing
          ? {
              ...existing,
              vote,
              is_deleted: false,
              deleted_at_client: null,
              sync_status: SyncStatusEnum.Pending,
              sync_error: null,
              updated_at_client: timestamp,
            }
          : buildLocalVote(me.user.user_id, placeId, vote);

    await db.my_votes.put(next);
    await replaceVoteOutbox(
      next,
      next.is_deleted
        ? makeOutboxRecord("place_vote", next.local_id, "vote_delete", { version: next.version }, placeId)
        : makeOutboxRecord(
            "place_vote",
            next.local_id,
            "vote_upsert",
            { vote: next.vote, ...(baselineVote ? { version: next.version } : {}) },
            placeId,
          ),
    );
    setMyVotes((current) => [next, ...current.filter((item) => item.place_id !== placeId)]);
    if (navigator.onLine) {
      await syncNow();
    } else {
      setToast({
        tone: "info",
        message: next.is_deleted ? "Снятие голоса сохранено и уйдёт при появлении сети" : "Голос сохранён и уйдёт при появлении сети",
      });
    }
  }

  async function startBind() {
    try {
      await api.startBindEmail(bindEmail, bindConsent);
      setBindStatus("Мы отправили ссылку на почту. Откройте письмо на этом устройстве.");
      setToast({ tone: "success", message: "Письмо ушло" });
    } catch (error) {
      console.error(error);
      setBindStatus("Не удалось отправить письмо");
      setToast({ tone: "error", message: "Почту пока не удалось привязать" });
    }
  }

  async function startLoginFlow() {
    try {
      await api.startLogin(loginEmail);
      setToast({ tone: "success", message: "Ссылка для входа отправлена" });
    } catch (error) {
      console.error(error);
      setToast({ tone: "error", message: "Не удалось отправить письмо для входа" });
    }
  }

  function openAddFlow() {
    const origin = currentLocation ?? center;
    void ensureCompassTracking();
    setSelectedPlaceId(null);
    setEditingLocalId(null);
    setNearestHintDismissed(false);
    setAddressSearchError(null);
    setAddFlow({
      step: "pick",
      draft: {
        lat: origin.lat,
        lng: origin.lng,
        title: "Двигайте карту под Wi-Fi маркер",
        subtitle: "Адрес сейчас определяется",
        isResolving: true,
        error: null,
      },
    });
    if (location.pathname !== "/") {
      navigate("/");
    }
  }

  function startEdit(localId: string) {
    const localPlace = myPlaces.find((item) => item.local_id === localId);
    if (!localPlace) {
      return;
    }
    setEditingLocalId(localId);
    setAddressSearchError(null);
    setAddFlow({
      step: "form",
      draft: {
        lat: localPlace.lat,
        lng: localPlace.lng,
        title: localPlace.place_name,
        subtitle: localPlace.wifi_name,
        isResolving: false,
      },
    });
    if (location.pathname !== "/") {
      navigate("/");
    }
  }

  function closePlaceSheet() {
    setSelectedPlaceId(null);
    if (routePlaceId || new URLSearchParams(location.search).has("place")) {
      navigate("/", { replace: true });
    }
  }

  function selectPlace(place: Place) {
    void ensureCompassTracking();
    setAddFlow(null);
    setSelectedPlaceId(place.place_id);
    navigate(`/place/${encodeURIComponent(place.place_id)}`, { replace: true });
  }

  async function sharePlace(place: Place) {
    const url = new URL(`/place/${encodeURIComponent(place.place_id)}`, window.location.origin);
    const browserNavigator = window.navigator as Navigator & {
      clipboard?: Clipboard;
      share?: (data?: ShareData) => Promise<void>;
    };

    try {
      if (typeof browserNavigator.share === "function") {
        await browserNavigator.share({ url: url.toString() });
      } else if (browserNavigator.clipboard?.writeText) {
        await browserNavigator.clipboard.writeText(url.toString());
        setToast({ tone: "success", message: "Ссылка скопирована" });
      } else {
        setToast({ tone: "info", message: url.toString() });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
      setToast({ tone: "error", message: "Не удалось открыть меню отправки" });
    }
  }

  async function copyCoordinates(place: Place) {
    const value = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setToast({ tone: "success", message: "Координаты скопированы" });
        return;
      }
      setToast({ tone: "info", message: value });
    } catch (error) {
      console.error(error);
      setToast({ tone: "error", message: "Не удалось скопировать координаты" });
    }
  }

  function handleMapCenterChange(nextCenter: { lat: number; lng: number }) {
    void persistCenter(nextCenter);

    if (addFlow?.step === "pick") {
      setAddressSearchError(null);
      setAddFlow((current) =>
        current?.step === "pick"
          ? {
              step: "pick",
              draft: {
                ...current.draft,
                lat: nextCenter.lat,
                lng: nextCenter.lng,
                title: "Определяю адрес...",
                subtitle: `${nextCenter.lat.toFixed(5)}, ${nextCenter.lng.toFixed(5)}`,
                isResolving: true,
                error: null,
              },
            }
          : current,
      );
    }
  }

  function handleMapViewportSettled(viewport: MapViewport) {
    if (offlineWarmRef.current != null) {
      window.clearTimeout(offlineWarmRef.current);
    }
    offlineWarmRef.current = window.setTimeout(() => {
      void refreshViewportCoverage(viewport);
    }, 900);
  }

  function confirmPickedLocation() {
    setAddressSearchError(null);
    setAddFlow((current) => (current?.step === "pick" ? { ...current, step: "form" } : current));
  }

  function cancelAddFlow() {
    setAddFlow(null);
    setEditingLocalId(null);
    setPickerMapMoving(false);
    setAddressSearchError(null);
    geocodeSearchAbortRef.current?.abort();
  }

  function dismissNearestHint() {
    setNearestHintDismissed(true);
    window.sessionStorage.setItem(NEARBY_HINT_DISMISSED_KEY, "1");
  }

  function toggleTheme() {
    setThemePreference((current) => {
      const resolved = current === "system" ? theme : current;
      return resolved === "dark" ? "light" : "dark";
    });
  }

  async function clearOfflineData() {
    if (clearingOffline) {
      return;
    }
    const confirmed = window.confirm(
      "Очистить офлайн-кэш? Если потом пропадёт интернет, карта и сохранённые офлайн-данные будут недоступны до следующей загрузки.",
    );
    if (!confirmed) {
      return;
    }

    setClearingOffline(true);
    try {
      await clearOfflineCaches();
      await Promise.all([
        db.regions.clear(),
        db.region_places.clear(),
        db.app_state.delete("nearby_places"),
      ]);
      setRegions([]);
      setMapPack(null);
      if (!navigator.onLine) {
        setNearbyPlaces([]);
      }
      setOfflineCacheState("idle");
      await refreshOfflineUsage();
      setToast({ tone: "success", message: "Офлайн-кэш очищен" });
      if (navigator.onLine) {
        void refreshBootstrap(center);
      }
    } catch (error) {
      console.error(error);
      setToast({ tone: "error", message: "Не удалось очистить офлайн-кэш" });
    } finally {
      setClearingOffline(false);
    }
  }

  const accountVotes = useMemo(() => {
    return myVotes.map((vote) => ({
      ...vote,
      place_name: visiblePlaceLookup.get(vote.place_id)?.place_name ?? "Точка Wi-Fi",
    }));
  }, [myVotes, visiblePlaceLookup]);

  const showNearestHint =
    isMapRoute &&
    !loading &&
    !selectedPlaceId &&
    !addFlow &&
    !sharedPlaceId &&
    !nearestHintDismissed &&
    Boolean(nearestHintPlace);

  const mapPageElement = (
    <MapPage
      center={center}
      loading={loading}
      mapPack={mapPack}
      visiblePlaces={visiblePlaces}
      selectedPlace={selectedPlace}
      nearestHintPlace={showNearestHint ? nearestHintPlace : null}
      currentLocation={currentLocation}
      locationState={locationState}
      theme={theme}
      addFlow={addFlow}
      pickerMapMoving={pickerMapMoving}
      onCenterChange={handleMapCenterChange}
      onPickerMotionChange={setPickerMapMoving}
      onViewportSettled={handleMapViewportSettled}
      onEnableLocation={enableLocation}
      onSelectPlace={selectPlace}
      onOpenAdd={openAddFlow}
      onConfirmPickedLocation={confirmPickedLocation}
      onCancelAdd={cancelAddFlow}
      onDismissNearestHint={dismissNearestHint}
      onToggleTheme={toggleTheme}
      onOpenAbout={() => navigate("/about")}
      offlineUsageLabel={formatStorageUsage(offlineUsageBytes)}
      offlineCacheState={offlineCacheState}
      offlineActionBusy={clearingOffline}
      onClearOffline={clearOfflineData}
    />
  );

  return (
    <div className={cn("min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]", isMapRoute ? "overflow-hidden" : "pb-32")}>
      <main className={cn(isMapRoute ? "h-[100dvh]" : "mx-auto flex min-h-screen max-w-[34rem] flex-col px-4 pb-28 pt-4")}>
        <Routes>
          <Route path="/" element={mapPageElement} />
          <Route path="/place/:placeId" element={mapPageElement} />
          <Route
            path="/activity"
            element={
              <ActivityPage
                myPlaces={myPlaces}
                myVotes={accountVotes}
                onEdit={startEdit}
              />
            }
          />
          <Route
            path="/about"
            element={
              <PlainPage title="О нас" backTo="/">
                <AboutPage
                  me={me}
                  bindEmail={bindEmail}
                  setBindEmail={setBindEmail}
                  bindConsent={bindConsent}
                  setBindConsent={setBindConsent}
                  bindStatus={bindStatus}
                  onStartBind={startBind}
                  loginEmail={loginEmail}
                  setLoginEmail={setLoginEmail}
                  onStartLogin={startLoginFlow}
                  onLogout={async () => {
                    await api.logout();
                    setToast({ tone: "success", message: "Сессия завершена" });
                    void initialize();
                  }}
                  installState={installState}
                />
              </PlainPage>
            }
          />
          <Route path="/me" element={<Navigate to="/activity" replace />} />
          <Route path="/profile" element={<Navigate to="/about" replace />} />
          <Route path="/my-data" element={<Navigate to="/activity" replace />} />
          <Route path="/offline" element={<Navigate to="/" replace />} />
          <Route
            path="/privacy"
            element={
              <PlainPage title="Политика конфиденциальности" backTo="/about">
                <PrivacyPage />
              </PlainPage>
            }
          />
          <Route
            path="/consent/personal-data-email"
            element={
              <PlainPage title="Согласие на обработку email" backTo="/about">
                <ConsentPage />
              </PlainPage>
            }
          />
        </Routes>
      </main>

      {!addFlow ? (
        <BottomNav
          activePath={location.pathname}
          addActive={Boolean(addFlow)}
          onOpenAdd={openAddFlow}
        />
      ) : null}

      <BottomSheet open={Boolean(selectedPlace)} onClose={closePlaceSheet}>
        {selectedPlace ? (
          <PlaceSheet
            place={selectedPlace}
            canEdit={Boolean(editablePlaceLocalId)}
            originLabel={currentLocation ? "от вас" : "от центра карты"}
            onEdit={() => (editablePlaceLocalId ? startEdit(editablePlaceLocalId) : undefined)}
            onVote={voteForPlace}
            onShare={sharePlace}
            onCopyCoordinates={copyCoordinates}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={addFlow?.step === "form"}
        onClose={cancelAddFlow}
        title={editingLocalId ? "Редактировать Wi-Fi" : "Добавить Вайфай"}
        headerSlot={
          addFlow?.step === "form" ? (
            <span className="line-clamp-2">
              {addFlow.draft.title}
              {addFlow.draft.subtitle ? ` · ${addFlow.draft.subtitle}` : ""}
            </span>
          ) : null
        }
      >
        <PlaceForm
          initial={editingLocalId ? myPlaces.find((item) => item.local_id === editingLocalId) ?? null : null}
          draft={addFlow?.step === "form" ? addFlow.draft : null}
          onSubmit={submitPlace}
          onCancel={cancelAddFlow}
          onSearchAddress={searchAddressForDraft}
          addressSearchBusy={addressSearchBusy}
          addressSearchError={addressSearchError}
        />
      </BottomSheet>

      {toast ? <ToastBanner toast={toast} /> : null}
    </div>
  );
}

async function replaceVoteOutbox(vote: LocalVote, nextRecord: ReturnType<typeof makeOutboxRecord>) {
  const stale = await db.outbox
    .filter((item) => item.entity_type === "place_vote" && item.entity_local_id === vote.local_id)
    .toArray();
  if (stale.length > 0) {
    await db.outbox.bulkDelete(stale.map((item) => item.client_operation_id));
  }
  await db.outbox.put(nextRecord);
}

async function removeVoteLocally(localId: string) {
  await db.my_votes.delete(localId);
  const stale = await db.outbox
    .filter((item) => item.entity_type === "place_vote" && item.entity_local_id === localId)
    .toArray();
  if (stale.length > 0) {
    await db.outbox.bulkDelete(stale.map((item) => item.client_operation_id));
  }
}

function packBlobToSource(pack: Pick<OfflinePack, "pack_id" | "region_name" | "version_hash">, blob: Blob): MapPackSource {
  return {
    kind: "file",
    key: `file:${pack.pack_id}:${pack.version_hash}`,
    label: pack.region_name,
    file: new File([blob], `${pack.pack_id}-${pack.version_hash.slice(0, 8)}.pmtiles`, {
      type: blob.type || "application/octet-stream",
    }),
  };
}
