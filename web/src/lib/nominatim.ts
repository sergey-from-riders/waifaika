type ReverseGeocodeResult = {
  title: string;
  subtitle: string;
  raw: unknown;
};

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

const reverseCache = new Map<string, ReverseGeocodeResult>();

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<ReverseGeocodeResult> {
  const key = cacheKey(lat, lng);
  const cached = reverseCache.get(key);
  if (cached) {
    return cached;
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ru");
  url.searchParams.set("zoom", "18");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
    },
    mode: "cors",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Nominatim reverse failed: ${response.status}`);
  }

  const payload = (await response.json()) as NominatimResponse;
  const result = normalizeAddress(payload);
  reverseCache.set(key, result);
  return result;
}

function normalizeAddress(payload: NominatimResponse): ReverseGeocodeResult {
  const address = payload.address ?? {};
  const house = address.house_number ? `${address.house_number}` : "";
  const road =
    address.road ??
    address.pedestrian ??
    address.footway ??
    address.path ??
    address.cycleway ??
    address.neighbourhood ??
    address.suburb ??
    "";
  const titleBase = [road, house].filter(Boolean).join(", ").trim();
  const district =
    address.city_district ??
    address.suburb ??
    address.neighbourhood ??
    address.city ??
    address.town ??
    "Сочи";
  const state = address.state ?? address.region ?? "Краснодарский край";

  const title = titleBase || payload.display_name?.split(",").slice(0, 2).join(", ").trim() || "Точка на карте";
  const subtitle = [district, state].filter(Boolean).join(" • ");

  return {
    title,
    subtitle,
    raw: payload,
  };
}

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}`;
}
