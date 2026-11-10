package app

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"wifiyka/backend/internal/config"
	"wifiyka/backend/internal/mail"
	"wifiyka/backend/internal/models"
)

func integrationApp(t *testing.T) (*App, string, models.User) {
	t.Helper()
	url := os.Getenv("WIFI_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set WIFI_TEST_DATABASE_URL to a migrated disposable PostGIS database")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	app := New(config.Config{SessionTTL: time.Hour}, slog.New(slog.NewTextHandler(io.Discard, nil)), pool, &mail.MemoryMailer{})
	me, token, err := app.BootstrapSession(context.Background(), "", "test", "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	return app, token, me.User
}
func operation(t *testing.T) models.SyncOperationRequest {
	t.Helper()
	payload, err := json.Marshal(models.PlaceInput{PlaceName: uuid.NewString(), WifiName: uuid.NewString(), VenueType: "cafe", AccessType: "free", Lat: 43.58, Lng: 39.72})
	if err != nil {
		t.Fatal(err)
	}
	return models.SyncOperationRequest{ClientOperationID: uuid.NewString(), EntityType: "place", OperationType: "place_create", Payload: payload}
}

func TestReplayCannotChangeTarget(t *testing.T) {
	app, token, _ := integrationApp(t)
	op := operation(t)
	if _, err := app.SyncOutbox(context.Background(), token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}}); err != nil {
		t.Fatal(err)
	}
	other := uuid.NewString()
	op.EntityID = &other
	if _, err := app.SyncOutbox(context.Background(), token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}}); err == nil {
		t.Fatal("reused request accepted another target")
	}
}
func TestConcurrentSyncReplayCreatesOnePlace(t *testing.T) {
	app, token, user := integrationApp(t)
	op := operation(t)
	var wg sync.WaitGroup
	ids := make(chan string, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			response, err := app.SyncOutbox(context.Background(), token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}})
			if err != nil {
				t.Error(err)
				return
			}
			if response.Results[0].EntityID == nil {
				t.Error("missing entity")
				return
			}
			ids <- *response.Results[0].EntityID
		}()
	}
	wg.Wait()
	close(ids)
	first := ""
	for id := range ids {
		if first == "" {
			first = id
		}
		if id != first {
			t.Error("duplicate entity")
		}
	}
	var count int
	if err := app.db.QueryRow(context.Background(), "SELECT count(*) FROM places WHERE user_id=$1", user.UserID).Scan(&count); err != nil || count != 1 {
		t.Fatalf("places=%d error=%v", count, err)
	}
}
func TestReceiptFailureRollsBackMutation(t *testing.T) {
	app, token, user := integrationApp(t)
	op := operation(t)
	ctx := context.Background()
	// The trigger is restricted to this operation so the fixture does not affect other tests.
	_, err := app.db.Exec(ctx, `CREATE OR REPLACE FUNCTION reject_test_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.client_operation_id='`+op.ClientOperationID+`' AND NEW.status='applied' THEN RAISE EXCEPTION 'injected receipt failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test_receipt BEFORE UPDATE ON sync_operations FOR EACH ROW EXECUTE FUNCTION reject_test_receipt();`)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = app.db.Exec(context.Background(), "DROP TRIGGER IF EXISTS reject_test_receipt ON sync_operations; DROP FUNCTION IF EXISTS reject_test_receipt()")
	})
	_, err = app.SyncOutbox(ctx, token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}})
	if err == nil {
		t.Fatal("expected injected error")
	}
	var count int
	_ = app.db.QueryRow(ctx, "SELECT count(*) FROM places WHERE user_id=$1", user.UserID).Scan(&count)
	if count != 0 {
		t.Fatalf("orphan place after rollback: %d", count)
	}
	_, err = app.db.Exec(ctx, "DROP TRIGGER reject_test_receipt ON sync_operations")
	if err != nil {
		t.Fatal(err)
	}
	response, err := app.SyncOutbox(ctx, token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}})
	if err != nil || response.Results[0].Status != "applied" {
		t.Fatalf("retry: %+v %v", response, err)
	}
}
func TestOperationIDCannotChangePayload(t *testing.T) {
	app, token, _ := integrationApp(t)
	op := operation(t)
	ctx := context.Background()
	_, err := app.SyncOutbox(ctx, token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}})
	if err != nil {
		t.Fatal(err)
	}
	op.Payload = operation(t).Payload
	if _, err = app.SyncOutbox(ctx, token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{op}}); err == nil {
		t.Fatal("reused ID accepted")
	}
}
func TestValidationDoesNotPoisonNextOperation(t *testing.T) {
	app, token, _ := integrationApp(t)
	bad := operation(t)
	bad.Payload = json.RawMessage(`{"place_name":"missing fields"}`)
	good := operation(t)
	response, err := app.SyncOutbox(context.Background(), token, models.SyncOutboxRequest{Operations: []models.SyncOperationRequest{bad, good}})
	if err != nil {
		t.Fatal(err)
	}
	if response.Results[0].Status != "failed" || response.Results[1].Status != "applied" {
		t.Fatalf("unexpected result: %+v", response)
	}
}
