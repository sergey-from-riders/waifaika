package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCrossOriginMutationRejected(t *testing.T) {
	for _, origin := range []string{"https://evil.example", "null"} {
		req := httptest.NewRequest("POST", "https://wifi.eval.su/api/v1/places", strings.NewReader(`{}`))
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		called := false
		requestBoundary(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true })).ServeHTTP(rec, req)
		if called || rec.Code != 403 {
			t.Fatalf("origin %s status=%d called=%v", origin, rec.Code, called)
		}
	}
}
func TestSameOriginMutationAllowed(t *testing.T) {
	req := httptest.NewRequest("POST", "https://wifi.eval.su/api/v1/places", strings.NewReader(`{}`))
	req.Header.Set("Origin", "https://wifi.eval.su")
	rec := httptest.NewRecorder()
	requestBoundary(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })).ServeHTTP(rec, req)
	if rec.Code != 204 {
		t.Fatal(rec.Code)
	}
}
func TestBodyLimitAndNonfiniteCoordinates(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/places", strings.NewReader(`{"x":"`+strings.Repeat("a", 2<<20)+`"}`))
	rec := httptest.NewRecorder()
	requestBoundary(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var data map[string]any
		if decodeJSON(r, &data) == nil {
			t.Error("oversized body accepted")
		}
	})).ServeHTTP(rec, req)
	for _, value := range []string{"NaN", "Inf", "-Inf"} {
		req := httptest.NewRequest("GET", "/?lat="+value+"&lng=0&radius_km=1", nil)
		if _, err := parseNearbyQuery(req); err == nil {
			t.Errorf("accepted %s", value)
		}
	}
}
func TestForwardedIPOnlyTrustedFromLoopback(t *testing.T) {
	for _, addr := range []string{"203.0.113.1:5000", "127.0.0.1:5000"} {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = addr
		req.Header.Set("X-Real-IP", "198.51.100.1")
		trustedProxyIP(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if addr == "203.0.113.1:5000" && clientIP(r) != "203.0.113.1" {
				t.Error("spoofed IP trusted")
			}
			if addr == "127.0.0.1:5000" && clientIP(r) != "198.51.100.1" {
				t.Error("proxy IP ignored")
			}
		})).ServeHTTP(httptest.NewRecorder(), req)
	}
}
