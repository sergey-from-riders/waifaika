package models

import (
	"encoding/json"
	"time"
)

type User struct {
	UserID      string     `json:"user_id"`
	UserType    string     `json:"user_type"`
	DisplayName *string    `json:"display_name,omitempty"`
	IsActive    bool       `json:"is_active"`
	Version     int64      `json:"version"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastSeenAt  *time.Time `json:"last_seen_at,omitempty"`
}

type SessionSummary struct {
	SessionID  string    `json:"session_id"`
	ExpiresAt  time.Time `json:"expires_at"`
	IsSecure   bool      `json:"is_secure"`
	CookieName string    `json:"cookie_name"`
}

type MeResponse struct {
	User    User           `json:"user"`
	Session SessionSummary `json:"session"`
}

type EmailStartRequest struct {
	Email           string `json:"email"`
	ConsentAccepted bool   `json:"consent_accepted"`
}

type EmailConfirmRequest struct {
	Token string `json:"token"`
}

type LoginStartRequest struct {
	Email string `json:"email"`
}

type Place struct {
	PlaceID          string     `json:"place_id"`
	UserID           string     `json:"user_id"`
	VenueType        string     `json:"venue_type"`
	PlaceName        string     `json:"place_name"`
	WifiName         string     `json:"wifi_name"`
	Description      *string    `json:"description,omitempty"`
	PromoText        *string    `json:"promo_text,omitempty"`
	AccessType       string     `json:"access_type"`
	Status           string     `json:"status"`
	Lat              float64    `json:"lat"`
	Lng              float64    `json:"lng"`
	WorksCount       int        `json:"works_count"`
	NotWorksCount    int        `json:"not_works_count"`
	LastVerifiedAt   *time.Time `json:"last_verified_at,omitempty"`
	Version          int64      `json:"version"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	SyncStatus       string     `json:"sync_status,omitempty"`
	SyncError        *string    `json:"sync_error,omitempty"`
	MyVote           *PlaceVote `json:"my_vote,omitempty"`
	DistanceMeters   *float64   `json:"distance_meters,omitempty"`
	DirectionDegrees *float64   `json:"direction_degrees,omitempty"`
}

type PlaceVote struct {
	PlaceVoteID  string     `json:"place_vote_id"`
	PlaceID      string     `json:"place_id"`
	UserID       string     `json:"user_id"`
	Vote         string     `json:"vote"`
	Version      int64      `json:"version"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastSyncedAt *time.Time `json:"last_synced_at,omitempty"`
	SyncStatus   string     `json:"sync_status,omitempty"`
	SyncError    *string    `json:"sync_error,omitempty"`
}

type PlaceReport struct {
	PlaceReportID string    `json:"place_report_id"`
	PlaceID       string    `json:"place_id"`
	UserID        string    `json:"user_id"`
	Reason        string    `json:"reason"`
	Comment       *string   `json:"comment,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type PlaceInput struct {
	VenueType   string  `json:"venue_type"`
	PlaceName   string  `json:"place_name"`
	WifiName    string  `json:"wifi_name"`
	Description *string `json:"description"`
	PromoText   *string `json:"promo_text"`
	AccessType  string  `json:"access_type"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

type PlacePatch struct {
	VenueType   *string  `json:"venue_type,omitempty"`
	PlaceName   *string  `json:"place_name,omitempty"`
	WifiName    *string  `json:"wifi_name,omitempty"`
	Description *string  `json:"description,omitempty"`
	PromoText   *string  `json:"promo_text,omitempty"`
	AccessType  *string  `json:"access_type,omitempty"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	Version     int64    `json:"version"`
}

type VoteInput struct {
	Vote    string `json:"vote"`
	Version *int64 `json:"version,omitempty"`
}

type ReportInput struct {
	Reason  string  `json:"reason"`
	Comment *string `json:"comment,omitempty"`
}

type DeleteInput struct {
	Version int64 `json:"version"`
}

type VoteDeleteResponse struct {
	Status      string `json:"status"`
	PlaceID     string `json:"place_id"`
	PlaceVoteID string `json:"place_vote_id"`
}

type PlaceQuery struct {
	BBox        string
	MineOnly    bool
	AccessTypes []string
}

type NearbyQuery struct {
	Lat      float64
	Lng      float64
	RadiusKM float64
}

type SyncOperationRequest struct {
	ClientOperationID string          `json:"client_operation_id"`
	EntityType        string          `json:"entity_type"`
	EntityID          *string         `json:"entity_id,omitempty"`
	OperationType     string          `json:"operation_type"`
	Payload           json.RawMessage `json:"payload"`
}

type SyncOutboxRequest struct {
	Operations []SyncOperationRequest `json:"operations"`
}

type SyncOperationResult struct {
	ClientOperationID string  `json:"client_operation_id"`
	Status            string  `json:"status"`
	EntityID          *string `json:"entity_id,omitempty"`
	ErrorCode         *string `json:"error_code,omitempty"`
	ErrorMessage      *string `json:"error_message,omitempty"`
}

type SyncOutboxResponse struct {
	Results    []SyncOperationResult `json:"results"`
	ServerTime time.Time             `json:"server_time"`
}

type OfflinePack struct {
	PackID      string    `json:"pack_id"`
	RegionName  string    `json:"region_name"`
	URL         string    `json:"url"`
	SizeBytes   int64     `json:"size_bytes"`
	VersionHash string    `json:"version_hash"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type OfflineManifestResponse struct {
	Packs      []OfflinePack `json:"packs"`
	RadiusKM   float64       `json:"radius_km"`
	ServerTime time.Time     `json:"server_time"`
}

type SyncBootstrapResponse struct {
	Me         MeResponse    `json:"me"`
	Nearby     []Place       `json:"nearby_places"`
	MyPlaces   []Place       `json:"my_places"`
	MyVotes    []PlaceVote   `json:"my_votes"`
	Offline    []OfflinePack `json:"offline_packs"`
	ServerTime time.Time     `json:"server_time"`
}

type SyncChangesResponse struct {
	Places     []Place     `json:"places"`
	MyVotes    []PlaceVote `json:"my_votes"`
	ServerTime time.Time   `json:"server_time"`
}
