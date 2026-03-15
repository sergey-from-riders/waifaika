package auth

import "testing"

func TestNewOpaqueToken(t *testing.T) {
	raw, hash, err := NewOpaqueToken()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if raw == "" || hash == "" {
		t.Fatalf("expected non-empty token and hash")
	}
	if HashToken(raw) != hash {
		t.Fatalf("hash mismatch")
	}
}
