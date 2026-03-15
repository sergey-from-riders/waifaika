export enum UserType {
  Anonymous = "anonymous",
  EmailLinked = "email_linked",
  Moderator = "moderator",
  Admin = "admin",
}

export enum AccessType {
  Free = "free",
  CustomerOnly = "customer_only",
  Unknown = "unknown",
}

export enum VenueType {
  Cafe = "cafe",
  Library = "library",
  Coworking = "coworking",
  Park = "park",
  Other = "other",
}

export enum VoteType {
  Works = "works",
  NotWorks = "not_works",
}

export enum SyncStatus {
  Synced = "synced",
  Pending = "pending",
  Failed = "failed",
  Conflict = "conflict",
}

export enum PlaceStatus {
  Active = "active",
  Hidden = "hidden",
  Deleted = "deleted",
  NeedsReview = "needs_review",
}

export enum ReportReason {
  Spam = "spam",
  Double = "double",
  WrongLocation = "wrong_location",
  Closed = "closed",
  Other = "other",
}

export type User = {
  user_id: string;
  user_type: UserType;
  display_name?: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  last_seen_at?: string | null;
};

export type SessionSummary = {
  session_id: string;
  expires_at: string;
  is_secure: boolean;
  cookie_name: string;
};

export type MeResponse = {
  user: User;
  session: SessionSummary;
};

export type PlaceVote = {
  place_vote_id: string;
  place_id: string;
  user_id: string;
  vote: VoteType;
  version: number;
  created_at: string;
  updated_at: string;
  sync_status?: SyncStatus;
  sync_error?: string | null;
};

export type VoteDeleteResponse = {
  status: string;
  place_id: string;
  place_vote_id: string;
};

export type Place = {
  place_id: string;
  user_id: string;
  venue_type: VenueType;
  place_name: string;
  wifi_name: string;
  description?: string | null;
  promo_text?: string | null;
  access_type: AccessType;
  status: PlaceStatus;
  lat: number;
  lng: number;
  works_count: number;
  not_works_count: number;
  last_verified_at?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  sync_status?: SyncStatus;
  sync_error?: string | null;
  my_vote?: PlaceVote | null;
  distance_meters?: number;
  direction_degrees?: number;
};

export type PlaceInput = {
  venue_type: VenueType;
  place_name: string;
  wifi_name: string;
  description?: string | null;
  promo_text?: string | null;
  access_type: AccessType;
  lat: number;
  lng: number;
};

export type PlacePatch = Partial<PlaceInput> & {
  version: number;
};

export type OfflinePack = {
  pack_id: string;
  region_name: string;
  url: string;
  size_bytes: number;
  version_hash: string;
  updated_at: string;
};

export type PackBounds = {
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
};

export type SyncBootstrapResponse = {
  me: MeResponse;
  nearby_places: Place[];
  my_places: Place[];
  my_votes: PlaceVote[];
  offline_packs: OfflinePack[];
  server_time: string;
};

export type SyncOutboxOperation = {
  client_operation_id: string;
  entity_type: string;
  entity_id?: string | null;
  operation_type: string;
  payload: unknown;
};

export type SyncOutboxResponse = {
  results: Array<{
    client_operation_id: string;
    status: "applied" | "failed" | "conflict";
    entity_id?: string | null;
    error_code?: string | null;
    error_message?: string | null;
  }>;
  server_time: string;
};

export type OfflineManifestResponse = {
  packs: OfflinePack[];
  radius_km: number;
  server_time: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  request_id: string;
};

export type LocalPlace = {
  local_id: string;
  place_id?: string;
  user_id: string;
  place_name: string;
  wifi_name: string;
  venue_type: VenueType;
  description?: string | null;
  promo_text?: string | null;
  access_type: AccessType;
  lat: number;
  lng: number;
  version: number;
  sync_status: SyncStatus;
  sync_error?: string | null;
  is_deleted: boolean;
  updated_at_client: string;
  last_synced_at?: string | null;
};

export type LocalVote = {
  local_id: string;
  place_vote_id?: string;
  place_id: string;
  user_id: string;
  vote: VoteType;
  server_vote?: VoteType | null;
  version: number;
  sync_status: SyncStatus;
  sync_error?: string | null;
  is_deleted: boolean;
  deleted_at_client?: string | null;
  updated_at_client: string;
  last_synced_at?: string | null;
};

export type RegionRecord = {
  pack_id: string;
  region_name: string;
  url: string;
  size_bytes: number;
  version_hash: string;
  updated_at: string;
  downloaded_at?: string | null;
  cache_status: "cached" | "pending" | "failed";
  bounds?: PackBounds | null;
};

export type RegionPlaceRecord = {
  compound_id: string;
  pack_id: string;
  place_id: string;
  place: Place;
};

export type MapPackSource =
  | {
      kind: "file";
      key: string;
      label: string;
      file: File;
    }
  | {
      kind: "remote";
      key: string;
      label: string;
      url: string;
    };
