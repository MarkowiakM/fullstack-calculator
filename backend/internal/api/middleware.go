package api

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"
)

// CORS allows the given origin (typically the frontend's dev server or the
// browser-facing compose URL) to call this API from a browser.
func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Recover turns a panic in a handler into a 500 INTERNAL response instead of
// crashing the server or leaking a stack trace to the client.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("api: panic recovered: %v", rec)
				writeError(w, http.StatusInternalServerError, "INTERNAL", "an unexpected error occurred")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// RequestID stamps every response with a short X-Request-Id header, so a
// specific request can be correlated with a specific server log line.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := newRequestID()
		w.Header().Set("X-Request-Id", id)
		log.Printf("api: request_id=%s method=%s path=%s", id, r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func newRequestID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(b)
}

// Timeout bounds how long a single request is allowed to take, independent
// of the server's connection-level ReadTimeout/WriteTimeout.
func Timeout(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.TimeoutHandler(next, d, fmt.Sprintf(`{"error":{"code":"INTERNAL","message":"request exceeded %s"}}`, d))
	}
}

// Chain applies middleware in the given order, so Chain(h, A, B) behaves as
// A(B(h)) — A is the outermost, first to see the request.
func Chain(h http.Handler, mw ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}
