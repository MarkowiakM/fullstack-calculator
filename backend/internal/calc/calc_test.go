package calc

import (
	"errors"
	"testing"

	"github.com/shopspring/decimal"
)

func d(t *testing.T, s string) decimal.Decimal {
	t.Helper()
	v, err := decimal.NewFromString(s)
	if err != nil {
		t.Fatalf("invalid decimal literal %q in test table: %v", s, err)
	}
	return v
}

func TestAdd(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"positive integers", "2", "3", "5"},
		{"decimals", "0.1", "0.2", "0.3"},
		{"negative operand", "-5", "3", "-2"},
		{"large values stay exact", "999999999999999999", "1", "1000000000000000000"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Add(d(t, tt.a), d(t, tt.b))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Add(%s, %s) = %s, want %s", tt.a, tt.b, got, want)
			}
		})
	}
}

func TestSubtract(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"positive result", "5", "3", "2"},
		{"negative result", "3", "5", "-2"},
		{"decimals", "0.3", "0.1", "0.2"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Subtract(d(t, tt.a), d(t, tt.b))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Subtract(%s, %s) = %s, want %s", tt.a, tt.b, got, want)
			}
		})
	}
}

func TestMultiply(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"positive integers", "4", "5", "20"},
		{"decimals stay exact", "0.1", "0.2", "0.02"},
		{"multiply by zero", "123.456", "0", "0"},
		{"negative operand", "-3", "4", "-12"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Multiply(d(t, tt.a), d(t, tt.b))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Multiply(%s, %s) = %s, want %s", tt.a, tt.b, got, want)
			}
		})
	}
}

func TestDivide(t *testing.T) {
	tests := []struct {
		name    string
		a, b    string
		want    string
		wantErr error
	}{
		{name: "exact division", a: "10", b: "2", want: "5"},
		{name: "repeating decimal rounds to fixed scale", a: "10", b: "3", want: "3.3333333333"},
		{name: "zero dividend", a: "0", b: "5", want: "0"},
		{name: "negative divisor", a: "10", b: "-2", want: "-5"},
		{name: "division by zero", a: "10", b: "0", wantErr: ErrDivisionByZero},
		{name: "zero divided by zero is still division by zero", a: "0", b: "0", wantErr: ErrDivisionByZero},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Divide(d(t, tt.a), d(t, tt.b))
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Divide(%s, %s) = %s, want %s", tt.a, tt.b, got, want)
			}
		})
	}
}

func TestPercent(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"50% of 200", "50", "200", "100"},
		{"10% of 90", "10", "90", "9"},
		{"0% of anything", "0", "500", "0"},
		{"percent over 100", "150", "10", "15"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Percent(d(t, tt.a), d(t, tt.b))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Percent(%s, %s) = %s, want %s", tt.a, tt.b, got, want)
			}
		})
	}
}

func TestSqrt(t *testing.T) {
	tests := []struct {
		name    string
		a       string
		want    string
		wantErr error
	}{
		{name: "perfect square", a: "9", want: "3"},
		{name: "zero", a: "0", want: "0"},
		{name: "non-perfect square", a: "2", want: "1.4142135623730951"},
		{name: "negative operand", a: "-9", wantErr: ErrNegativeSqrt},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Sqrt(d(t, tt.a))
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Sqrt(%s) = %s, want %s", tt.a, got, want)
			}
		})
	}
}

func TestPower(t *testing.T) {
	tests := []struct {
		name           string
		base, exponent string
		want           string
		wantErr        error
	}{
		{name: "positive integer exponent", base: "2", exponent: "10", want: "1024"},
		{name: "zero exponent", base: "5", exponent: "0", want: "1"},
		{name: "negative exponent", base: "2", exponent: "-1", want: "0.5"},
		{name: "exponent magnitude too large", base: "2", exponent: "5000", wantErr: ErrResultOutOfRange},
		{name: "result overflows float64 range", base: "10", exponent: "1000", wantErr: ErrResultOutOfRange},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Power(d(t, tt.base), d(t, tt.exponent))
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if want := d(t, tt.want); !got.Equal(want) {
				t.Errorf("Power(%s, %s) = %s, want %s", tt.base, tt.exponent, got, want)
			}
		})
	}
}
