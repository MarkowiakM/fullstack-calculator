package api

import (
	_ "embed"
	"net/http"
)

//go:embed openapi.yaml
var openapiSpec []byte

//go:embed api.html
var redocHTML []byte

// DocsHandler serves GET /docs — a static ReDoc page rendering the embedded
// OpenAPI spec, so the API documentation ships inside the binary itself.
func DocsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(redocHTML)
}

// OpenAPISpecHandler serves GET /docs/openapi.yaml, the spec DocsHandler's
// page points at.
func OpenAPISpecHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/yaml")
	w.Write(openapiSpec)
}
