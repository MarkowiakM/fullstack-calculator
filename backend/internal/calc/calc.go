package calc

import (
	"math"

	"github.com/shopspring/decimal"
)

// divisionScale is how many decimal places Divide rounds to. Division is the
// only core operation that can produce a non-terminating decimal expansion
// (e.g. 10/3), so it's the only one that needs a fixed output scale.
const divisionScale = 10

// maxExponentMagnitude caps the exponent operand of Power so a pathological
// input (e.g. 1e300) fails fast with a clear error instead of an unbounded
// computation.
const maxExponentMagnitude = 1000

// Add returns a + b.
func Add(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Add(b), nil
}

// Subtract returns a - b.
func Subtract(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Sub(b), nil
}

// Multiply returns a * b.
func Multiply(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Mul(b), nil
}

// Divide returns a / b, rounded to divisionScale decimal places.
func Divide(a, b decimal.Decimal) (decimal.Decimal, error) {
	if b.IsZero() {
		return decimal.Decimal{}, ErrDivisionByZero
	}
	return a.DivRound(b, divisionScale), nil
}

// Percent returns a% of b (e.g. Percent(50, 200) = 100). Division by 100 is
// exact for a decimal type, so this needs no rounding.
func Percent(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Mul(b).Div(decimal.NewFromInt(100)), nil
}

// Sqrt returns the square root of a.
//
// There is no exact decimal algorithm for irrational roots, so this falls
// back to float64 — a deliberate, documented trade-off (see README).
func Sqrt(a decimal.Decimal) (decimal.Decimal, error) {
	if a.IsNegative() {
		return decimal.Decimal{}, ErrNegativeSqrt
	}
	f, _ := a.Float64()
	result := math.Sqrt(f)
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return decimal.Decimal{}, ErrResultOutOfRange
	}
	return decimal.NewFromFloat(result), nil
}

// Power returns base raised to exponent.
//
// Like Sqrt, this falls back to float64 for the same reason: no exact
// decimal algorithm for irrational results.
func Power(base, exponent decimal.Decimal) (decimal.Decimal, error) {
	if exponent.Abs().GreaterThan(decimal.NewFromInt(maxExponentMagnitude)) {
		return decimal.Decimal{}, ErrResultOutOfRange
	}
	b, _ := base.Float64()
	e, _ := exponent.Float64()
	result := math.Pow(b, e)
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return decimal.Decimal{}, ErrResultOutOfRange
	}
	return decimal.NewFromFloat(result), nil
}
