package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func doRequest(t *testing.T, mux http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) errorBody {
	t.Helper()
	var body errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not a valid error envelope: %v (body: %s)", err, rec.Body.String())
	}
	return body
}

func TestHealth(t *testing.T) {
	mux := NewMux("http://localhost:5173")
	rec := doRequest(t, mux, http.MethodGet, "/health", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Body.String(); !strings.Contains(got, `"status":"ok"`) {
		t.Errorf("body = %s, want it to contain status:ok", got)
	}
}

func TestCalculate_HappyPath(t *testing.T) {
	mux := NewMux("http://localhost:5173")

	tests := []struct {
		name       string
		operation  string
		operands   []string
		wantResult string
	}{
		{"add", "add", []string{"2", "3"}, "5"},
		{"subtract", "subtract", []string{"5", "3"}, "2"},
		{"multiply", "multiply", []string{"4", "5"}, "20"},
		{"divide", "divide", []string{"10", "4"}, "2.5"},
		{"power", "power", []string{"2", "10"}, "1024"},
		{"percentage", "percentage", []string{"50", "200"}, "100"},
		{"sqrt", "sqrt", []string{"9"}, "3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			operands, _ := json.Marshal(tt.operands)
			body := `{"operation":"` + tt.operation + `","operands":` + string(operands) + `}`
			rec := doRequest(t, mux, http.MethodPost, "/api/v1/calculations", body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body: %s)", rec.Code, rec.Body.String())
			}
			var resp calculateResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("invalid response JSON: %v", err)
			}
			if resp.Result != tt.wantResult {
				t.Errorf("result = %s, want %s", resp.Result, tt.wantResult)
			}
		})
	}
}

func TestCalculate_400s(t *testing.T) {
	mux := NewMux("http://localhost:5173")

	tests := []struct {
		name     string
		body     string
		wantCode string
	}{
		{"malformed json", `{"operation":`, "INVALID_JSON"},
		{"unknown field", `{"operation":"add","operands":["1","2"],"extra":true}`, "INVALID_JSON"},
		{"unknown operation", `{"operation":"modulo","operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"missing operation", `{"operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"wrong arity too few", `{"operation":"add","operands":["1"]}`, "WRONG_ARITY"},
		{"wrong arity too many", `{"operation":"sqrt","operands":["1","2"]}`, "WRONG_ARITY"},
		{"non-numeric operand", `{"operation":"add","operands":["1","abc"]}`, "INVALID_OPERAND"},
		{"empty string operand", `{"operation":"add","operands":["1",""]}`, "INVALID_OPERAND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := doRequest(t, mux, http.MethodPost, "/api/v1/calculations", tt.body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (body: %s)", rec.Code, rec.Body.String())
			}
			if got := decodeError(t, rec).Error.Code; got != tt.wantCode {
				t.Errorf("error code = %s, want %s", got, tt.wantCode)
			}
		})
	}
}

func TestCalculate_422s(t *testing.T) {
	mux := NewMux("http://localhost:5173")

	tests := []struct {
		name     string
		body     string
		wantCode string
	}{
		{"division by zero", `{"operation":"divide","operands":["10","0"]}`, "DIVISION_BY_ZERO"},
		{"negative sqrt", `{"operation":"sqrt","operands":["-9"]}`, "NEGATIVE_SQRT"},
		{"power result out of range", `{"operation":"power","operands":["10","1000"]}`, "RESULT_OUT_OF_RANGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := doRequest(t, mux, http.MethodPost, "/api/v1/calculations", tt.body)
			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status = %d, want 422 (body: %s)", rec.Code, rec.Body.String())
			}
			if got := decodeError(t, rec).Error.Code; got != tt.wantCode {
				t.Errorf("error code = %s, want %s", got, tt.wantCode)
			}
		})
	}
}

func TestCalculate_WrongMethod(t *testing.T) {
	mux := NewMux("http://localhost:5173")
	rec := doRequest(t, mux, http.MethodGet, "/api/v1/calculations", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

func TestCalculate_OversizedBody(t *testing.T) {
	mux := NewMux("http://localhost:5173")
	huge := `{"operation":"add","operands":["` + strings.Repeat("9", maxBodyBytes) + `","1"]}`
	rec := doRequest(t, mux, http.MethodPost, "/api/v1/calculations", huge)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for an oversized body (body head: %.80s)", rec.Code, rec.Body.String())
	}
}

func TestCalculate_CORSPreflight(t *testing.T) {
	mux := NewMux("http://localhost:5173")
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/calculations", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, want the configured origin", got)
	}
}
