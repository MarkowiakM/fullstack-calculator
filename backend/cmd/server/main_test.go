package main

import "testing"

func TestEnvOr(t *testing.T) {
	if got := envOr("THIS_VAR_SHOULD_NOT_EXIST", "fallback"); got != "fallback" {
		t.Errorf("envOr with unset var = %q, want %q", got, "fallback")
	}
	t.Setenv("THIS_VAR_SHOULD_EXIST", "value")
	if got := envOr("THIS_VAR_SHOULD_EXIST", "fallback"); got != "value" {
		t.Errorf("envOr with set var = %q, want %q", got, "value")
	}
}
