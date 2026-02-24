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

func TestBuildDefaultBPF_Inbound(t *testing.T) {
	local := map[string]struct{}{"192.168.1.10": {}}
	bpf := BuildDefaultBPF("tcp or udp", "in", local)
	if !contains(bpf, "dst host 192.168.1.10") {
		t.Fatalf("expected dst host clause for inbound, got %q", bpf)
	}
	if contains(bpf, "src host") {
		t.Fatalf("unexpected src host clause for inbound direction, got %q", bpf)
	}
}

func TestBuildDefaultBPF_EmptyBaseExpr(t *testing.T) {
	local := map[string]struct{}{"10.0.0.1": {}}
	bpf := BuildDefaultBPF("", "out", local)
	if !contains(bpf, "tcp or udp or icmp") {
		t.Fatalf("expected default base expr, got %q", bpf)
	}
}

func TestBuildDefaultBPF_EmptyDirection(t *testing.T) {
	local := map[string]struct{}{"10.0.0.1": {}}
	bpf := BuildDefaultBPF("tcp", "", local)
	// Empty direction defaults to "out"
	if !contains(bpf, "src host 10.0.0.1") {
		t.Fatalf("expected src host for default out direction, got %q", bpf)
	}
}

func TestBuildDefaultBPF_NoLocalIPs(t *testing.T) {
	bpf := BuildDefaultBPF("tcp", "out", map[string]struct{}{})
	// No local IPs: falls back to protocol-only with both-private exclusion
	if !contains(bpf, "not") {
		t.Fatalf("expected RFC1918 both-private exclusion, got %q", bpf)
	}
	if contains(bpf, "src host") {
		t.Fatalf("unexpected src host with no local IPs, got %q", bpf)
	}
}

func TestBuildDefaultBPF_IPv6OnlyLocalIPs(t *testing.T) {
	// Only IPv6 addresses – nothing for the BPF src host clause
	local := map[string]struct{}{"fe80::1": {}, "::1": {}}
	bpf := BuildDefaultBPF("tcp", "out", local)
	if contains(bpf, "src host") {
		t.Fatalf("expected no src host when only IPv6 local IPs, got %q", bpf)
	}
	if !contains(bpf, "not") {
		t.Fatalf("expected RFC1918 exclusion clause, got %q", bpf)
	}
}

func TestBuildDefaultBPF_MultipleIPv4(t *testing.T) {
	local := map[string]struct{}{"10.0.0.1": {}, "10.0.0.2": {}}
	bpf := BuildDefaultBPF("tcp", "out", local)
	if !contains(bpf, "src host 10.0.0.1") {
		t.Fatalf("expected first IP in BPF, got %q", bpf)
	}
	if !contains(bpf, "src host 10.0.0.2") {
		t.Fatalf("expected second IP in BPF, got %q", bpf)
	}
}

func TestListIfaces(t *testing.T) {
	ifaces, err := ListIfaces()
	if err != nil {
		t.Fatalf("ListIfaces: %v", err)
	}
	if len(ifaces) == 0 {
		t.Fatalf("expected at least one network interface")
	}
}

func TestLocalIPsForInterface_Valid(t *testing.T) {
	// Use loopback which should always be present
	ips, err := LocalIPsForInterface("lo")
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if len(ips) == 0 {
		t.Fatalf("expected at least one IP on loopback")
	}
	if _, ok := ips["127.0.0.1"]; !ok {
		t.Fatalf("expected 127.0.0.1 in loopback IPs, got %v", ips)
	}
}

func TestLocalIPsForInterface_Invalid(t *testing.T) {
	_, err := LocalIPsForInterface("this-iface-does-not-exist-xyz")
	if err == nil {
		t.Fatalf("expected error for nonexistent interface")
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
