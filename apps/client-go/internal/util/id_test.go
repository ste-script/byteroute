package util

import "testing"

func TestStableID_IsDeterministic(t *testing.T) {
	a := StableID("host", "TCP", "1.2.3.4", "5.6.7.8", 123, 443)
	b := StableID("host", "TCP", "1.2.3.4", "5.6.7.8", 123, 443)
	if a != b {
		t.Fatalf("expected deterministic id, got %q != %q", a, b)
	}
	if a == "" {
		t.Fatalf("expected non-empty id")
	}
}

func TestStableID_ChangesWithHostID(t *testing.T) {
	a := StableID("host-a", "TCP", "1.2.3.4")
	b := StableID("host-b", "TCP", "1.2.3.4")
	if a == b {
		t.Fatalf("expected different ids for different host IDs")
	}
}
