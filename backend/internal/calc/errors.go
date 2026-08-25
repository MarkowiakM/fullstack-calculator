// Package calc implements the calculator's arithmetic. It is pure domain
// logic: no net/http, no JSON, no knowledge of the wire format.
package calc

import "errors"

var (
	// ErrDivisionByZero is returned by Divide when the divisor is zero.
	ErrDivisionByZero = errors.New("division by zero")

	// ErrNegativeSqrt is returned by Sqrt when the operand is negative.
	ErrNegativeSqrt = errors.New("square root of a negative number is undefined")

	// ErrResultOutOfRange is returned when a computation would produce a
	// non-finite (NaN/±Inf) or otherwise unrepresentable result.
	ErrResultOutOfRange = errors.New("result exceeds supported range")
)
