package capture

import "testing"

func TestBuildDefaultBPF_Outbound(t *testing.T) {
	local := map[string]struct{}{"10.0.0.1": {}, "fe80::1": {}}
	bpf := BuildDefaultBPF("tcp or udp", "out", local)
	if bpf == "tcp or udp" {
		t.Fatalf("expected outbound BPF to include local IP clause")
	}
	if want := "src host 10.0.0.1"; !contains(bpf, want) {
		t.Fatalf("expected %q in %q", want, bpf)
	}
	if contains(bpf, "fe80") {
		t.Fatalf("expected ipv6 to be excluded from BPF for portability")
	}
	if !contains(bpf, "not") || !contains(bpf, "net 10.0.0.0/8") {
		t.Fatalf("expected RFC1918 both-private exclusion clause in %q", bpf)
	}
}

func TestBuildDefaultBPF_Both(t *testing.T) {
	local := map[string]struct{}{"10.0.0.1": {}}
	bpf := BuildDefaultBPF("tcp", "both", local)
	if bpf == "tcp" {
		t.Fatalf("expected both-private exclusion to still apply, got %q", bpf)
	}
}

func contains(s, sub string) bool {
	return len(sub) == 0 || (len(s) >= len(sub) && (index(s, sub) >= 0))
}

func index(s, sub string) int {
	// tiny helper to avoid importing strings in test
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
