import type {
  ApiError,
  MeResponse,
  OfflineManifestResponse,
  Place,
  PlaceInput,
  PlacePatch,
  PlaceVote,
  ReportReason,
  SyncBootstrapResponse,
  SyncOutboxOperation,
  SyncOutboxResponse,
  VoteDeleteResponse,
} from "@/lib/types";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    const error = new Error(message) as Error & { payload?: ApiError };
    error.payload = payload ?? undefined;
    throw error;
  }

  return (await response.json()) as T;
}

export const api = {
  bootstrapSession() {
    return request<MeResponse>("/api/v1/session/bootstrap", { method: "POST" });
  },
  getMe() {
    return request<MeResponse>("/api/v1/me");
  },
  syncBootstrap(lat: number, lng: number, radiusKm = 100) {
    return request<SyncBootstrapResponse>(`/api/v1/sync/bootstrap?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  },
  syncChanges(since: string) {
    return request<{ places: Place[]; my_votes: PlaceVote[]; server_time: string }>(`/api/v1/sync/changes?since=${encodeURIComponent(since)}`);
  },
  offlineManifest(lat: number, lng: number, radiusKm = 100) {
    return request<OfflineManifestResponse>(`/api/v1/offline/manifest?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  },
  listPlaces(params: URLSearchParams) {
    return request<{ places: Place[] }>(`/api/v1/places?${params.toString()}`);
  },
  getPlace(placeId: string) {
    return request<Place>(`/api/v1/places/${placeId}`);
  },
  createPlace(input: PlaceInput) {
    return request<Place>("/api/v1/places", { method: "POST", body: JSON.stringify(input) });
  },
  updatePlace(placeId: string, input: PlacePatch) {
    return request<Place>(`/api/v1/places/${placeId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deletePlace(placeId: string, version: number) {
    return request<{ status: string }>(`/api/v1/places/${placeId}`, { method: "DELETE", body: JSON.stringify({ version }) });
  },
  vote(placeId: string, vote: "works" | "not_works", version?: number) {
    return request<PlaceVote>(`/api/v1/places/${placeId}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote, version }),
    });
  },
  deleteVote(placeId: string, version: number) {
    return request<VoteDeleteResponse>(`/api/v1/places/${placeId}/vote`, {
      method: "DELETE",
      body: JSON.stringify({ version }),
    });
  },
  reportPlace(placeId: string, reason: ReportReason, comment?: string) {
    return request<{ status?: string }>(`/api/v1/places/${placeId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, comment }),
    });
  },
  startBindEmail(email: string, consentAccepted: boolean) {
    return request<{ status: string }>("/api/v1/auth/email/start-bind", {
      method: "POST",
      body: JSON.stringify({ email, consent_accepted: consentAccepted }),
    });
  },
  confirmBindEmail(token: string) {
    return request<MeResponse>("/api/v1/auth/email/confirm-bind", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  startLogin(email: string) {
    return request<{ status: string }>("/api/v1/auth/email/start-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  confirmLogin(token: string) {
    return request<MeResponse>("/api/v1/auth/email/confirm-login", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  logout() {
    return request<{ status: string }>("/api/v1/auth/logout", { method: "POST" });
  },
  syncOutbox(operations: SyncOutboxOperation[]) {
    return request<SyncOutboxResponse>("/api/v1/sync/outbox", {
      method: "POST",
      body: JSON.stringify({ operations }),
    });
  },
};
