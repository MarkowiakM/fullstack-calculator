package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	healthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Body.String(); !strings.Contains(got, `"status":"ok"`) {
		t.Errorf("body = %s, want it to contain status:ok", got)
	}
}

func TestEnvOr(t *testing.T) {
	if got := envOr("THIS_VAR_SHOULD_NOT_EXIST", "fallback"); got != "fallback" {
		t.Errorf("envOr with unset var = %q, want %q", got, "fallback")
	}
	t.Setenv("THIS_VAR_SHOULD_EXIST", "value")
	if got := envOr("THIS_VAR_SHOULD_EXIST", "fallback"); got != "value" {
		t.Errorf("envOr with set var = %q, want %q", got, "value")
	}
}
