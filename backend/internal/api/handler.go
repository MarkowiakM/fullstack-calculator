package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/shopspring/decimal"

	"github.com/MarkowiakM/fullstack-calculator/backend/internal/calc"
)

// maxBodyBytes bounds the request body size — generous for a handful of
// numeric strings, small enough to reject an abusive payload outright.
const maxBodyBytes = 1 << 16 // 64 KiB

const requestTimeout = 5 * time.Second

type calculateRequest struct {
	Operation string   `json:"operation"`
	Operands  []string `json:"operands"`
}

type calculateResponse struct {
	Operation string   `json:"operation"`
	Operands  []string `json:"operands"`
	Result    string   `json:"result"`
}

// opDef pairs an operation's arity with a uniform adapter over calc's
// naturally-typed functions, so the handler has one dispatch path instead of
// a signature per operation.
type opDef struct {
	arity int
	fn    func([]decimal.Decimal) (decimal.Decimal, error)
}

var ops = map[string]opDef{
	"add":      {2, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Add(o[0], o[1]) }},
	"subtract": {2, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Subtract(o[0], o[1]) }},
	"multiply": {2, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Multiply(o[0], o[1]) }},
	"divide":   {2, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Divide(o[0], o[1]) }},
	"power":    {2, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Power(o[0], o[1]) }},
	"percentage": {2, func(o []decimal.Decimal) (decimal.Decimal, error) {
		return calc.Percent(o[0], o[1])
	}},
	"sqrt": {1, func(o []decimal.Decimal) (decimal.Decimal, error) { return calc.Sqrt(o[0]) }},
}

// CalculateHandler serves POST /api/v1/calculations. It is registered
// without a method prefix (see NewMux) so CORS middleware can answer the
// browser's OPTIONS preflight before this handler's own method check runs.
func CalculateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "use POST")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	var req calculateRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "request body is not valid JSON: "+err.Error())
		return
	}

	def, ok := ops[req.Operation]
	if !ok {
		writeError(w, http.StatusBadRequest, "UNKNOWN_OPERATION", fmt.Sprintf("unknown operation %q", req.Operation))
		return
	}

	if len(req.Operands) != def.arity {
		writeError(w, http.StatusBadRequest, "WRONG_ARITY",
			fmt.Sprintf("operation %q requires %d operand(s), got %d", req.Operation, def.arity, len(req.Operands)))
		return
	}

	operands := make([]decimal.Decimal, len(req.Operands))
	for i, s := range req.Operands {
		v, err := decimal.NewFromString(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_OPERAND",
				fmt.Sprintf("operand %d (%q) is not a valid number", i, s))
			return
		}
		operands[i] = v
	}

	result, err := def.fn(operands)
	if err != nil {
		status, code := mapDomainError(err)
		writeError(w, status, code, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{
		Operation: req.Operation,
		Operands:  req.Operands,
		Result:    result.String(),
	})
}

func mapDomainError(err error) (status int, code string) {
	switch {
	case errors.Is(err, calc.ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"
	case errors.Is(err, calc.ErrNegativeSqrt):
		return http.StatusUnprocessableEntity, "NEGATIVE_SQRT"
	case errors.Is(err, calc.ErrResultOutOfRange):
		return http.StatusUnprocessableEntity, "RESULT_OUT_OF_RANGE"
	default:
		return http.StatusInternalServerError, "INTERNAL"
	}
}

// HealthHandler serves GET /health for the container healthcheck.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// NewMux wires the routes and middleware into a ready-to-serve handler.
func NewMux(allowedOrigin string) http.Handler {
	mux := http.NewServeMux()

	// No method prefix here: CalculateHandler enforces POST itself, which
	// lets CORS middleware answer an OPTIONS preflight for the same path
	// before that check runs. A method-prefixed pattern would 405 the
	// preflight at the mux level, before middleware ever sees it.
	mux.Handle("/api/v1/calculations", Chain(
		http.HandlerFunc(CalculateHandler),
		RequestID, Recover, CORS(allowedOrigin), Timeout(requestTimeout),
	))
	mux.Handle("GET /health", http.HandlerFunc(HealthHandler))
	mux.Handle("GET /docs", http.HandlerFunc(DocsHandler))
	mux.Handle("GET /docs/openapi.yaml", http.HandlerFunc(OpenAPISpecHandler))

	return mux
}
