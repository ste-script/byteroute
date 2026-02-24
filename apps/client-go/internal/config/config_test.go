package config

import (
	"flag"
	"os"
	"testing"
	"time"
)

// resetFlags resets the global FlagSet so test cases can call Parse() independently.
func resetFlags(args []string) {
	flag.CommandLine = flag.NewFlagSet(args[0], flag.ContinueOnError)
	os.Args = args
}

func TestEnv_Default(t *testing.T) {
	os.Unsetenv("TEST_ENV_KEY_XYZ")
	got := env("TEST_ENV_KEY_XYZ", "default-val")
	if got != "default-val" {
		t.Fatalf("expected default-val, got %q", got)
	}
}

func TestEnv_EnvSet(t *testing.T) {
	t.Setenv("TEST_ENV_KEY_XYZ", "from-env")
	got := env("TEST_ENV_KEY_XYZ", "default-val")
	if got != "from-env" {
		t.Fatalf("expected from-env, got %q", got)
	}
}

func TestParse_Defaults(t *testing.T) {
	resetFlags([]string{"cmd"})
	cfg := Parse()

	if cfg.FlushInterval != 5*time.Second {
		t.Fatalf("expected flush 5s, got %v", cfg.FlushInterval)
	}
	if cfg.SnapLen != 1600 {
		t.Fatalf("expected snaplen 1600, got %d", cfg.SnapLen)
	}
	if !cfg.Promisc {
		t.Fatalf("expected promisc=true by default")
	}
	if cfg.MaxBatchConns != 200 {
		t.Fatalf("expected max-batch-conns 200, got %d", cfg.MaxBatchConns)
	}
	if cfg.MaxBatchBytes != 1500000 {
		t.Fatalf("expected max-batch-bytes 1500000, got %d", cfg.MaxBatchBytes)
	}
	if cfg.BackendURL != "http://localhost:4000" {
		t.Fatalf("expected default backend URL, got %q", cfg.BackendURL)
	}
	if cfg.HTTPTimeout != 5*time.Second {
		t.Fatalf("expected http-timeout 5s, got %v", cfg.HTTPTimeout)
	}
	if cfg.DedupMode != "flow" {
		t.Fatalf("expected dedup mode flow, got %q", cfg.DedupMode)
	}
	if cfg.IdleTTL != 2*time.Minute {
		t.Fatalf("expected idle-ttl 2m, got %v", cfg.IdleTTL)
	}
	if cfg.Direction != "out" {
		t.Fatalf("expected direction out, got %q", cfg.Direction)
	}
}

func TestParse_FlagsOverrideDefaults(t *testing.T) {
	resetFlags([]string{
		"cmd",
		"--iface", "eth0",
		"--bpf", "tcp",
		"--direction", "in",
		"--snaplen", "512",
		"--promisc=false",
		"--flush", "10s",
		"--max-batch-conns", "50",
		"--max-batch-bytes", "500000",
		"--backend", "http://my-backend:8080",
		"--http-timeout", "3s",
		"--auth-token", "my-token",
		"--host-id", "host1",
		"--dedupe", "ip",
		"--idle-ttl", "30s",
	})
	cfg := Parse()

	if cfg.Iface != "eth0" {
		t.Fatalf("expected iface=eth0, got %q", cfg.Iface)
	}
	if cfg.BPF != "tcp" {
		t.Fatalf("expected bpf=tcp, got %q", cfg.BPF)
	}
	if cfg.Direction != "in" {
		t.Fatalf("expected direction=in, got %q", cfg.Direction)
	}
	if cfg.SnapLen != 512 {
		t.Fatalf("expected snaplen=512, got %d", cfg.SnapLen)
	}
	if cfg.Promisc {
		t.Fatalf("expected promisc=false")
	}
	if cfg.FlushInterval != 10*time.Second {
		t.Fatalf("expected flush=10s, got %v", cfg.FlushInterval)
	}
	if cfg.MaxBatchConns != 50 {
		t.Fatalf("expected max-batch-conns=50, got %d", cfg.MaxBatchConns)
	}
	if cfg.MaxBatchBytes != 500000 {
		t.Fatalf("expected max-batch-bytes=500000, got %d", cfg.MaxBatchBytes)
	}
	if cfg.BackendURL != "http://my-backend:8080" {
		t.Fatalf("expected backend=http://my-backend:8080, got %q", cfg.BackendURL)
	}
	if cfg.HTTPTimeout != 3*time.Second {
		t.Fatalf("expected http-timeout=3s, got %v", cfg.HTTPTimeout)
	}
	if cfg.AuthToken != "my-token" {
		t.Fatalf("expected auth-token=my-token, got %q", cfg.AuthToken)
	}
	if cfg.HostID != "host1" {
		t.Fatalf("expected host-id=host1, got %q", cfg.HostID)
	}
	if cfg.DedupMode != "ip" {
		t.Fatalf("expected dedupe=ip, got %q", cfg.DedupMode)
	}
	if cfg.IdleTTL != 30*time.Second {
		t.Fatalf("expected idle-ttl=30s, got %v", cfg.IdleTTL)
	}
}

func TestParse_ListIfacesFlag(t *testing.T) {
	resetFlags([]string{"cmd", "--list-ifaces"})
	cfg := Parse()
	if !cfg.ListIfaces {
		t.Fatalf("expected list-ifaces=true")
	}
}

func TestParse_EnvVarsUsed(t *testing.T) {
	t.Setenv("BYTEROUTE_IFACE", "wlan0")
	t.Setenv("BYTEROUTE_DIRECTION", "both")
	t.Setenv("BYTEROUTE_BPF", "udp")
	t.Setenv("BYTEROUTE_BACKEND_URL", "http://env-backend:9000")
	t.Setenv("BYTEROUTE_AUTH_TOKEN", "env-token")
	t.Setenv("BYTEROUTE_HOST_ID", "env-host")
	t.Setenv("BYTEROUTE_DEDUPE_MODE", "ip")

	resetFlags([]string{"cmd"})
	cfg := Parse()

	if cfg.Iface != "wlan0" {
		t.Fatalf("expected iface=wlan0 from env, got %q", cfg.Iface)
	}
	if cfg.Direction != "both" {
		t.Fatalf("expected direction=both from env, got %q", cfg.Direction)
	}
	if cfg.BPF != "udp" {
		t.Fatalf("expected bpf=udp from env, got %q", cfg.BPF)
	}
	if cfg.BackendURL != "http://env-backend:9000" {
		t.Fatalf("expected backend URL from env, got %q", cfg.BackendURL)
	}
	if cfg.AuthToken != "env-token" {
		t.Fatalf("expected auth-token from env, got %q", cfg.AuthToken)
	}
	if cfg.HostID != "env-host" {
		t.Fatalf("expected host-id from env, got %q", cfg.HostID)
	}
	if cfg.DedupMode != "ip" {
		t.Fatalf("expected dedupe=ip from env, got %q", cfg.DedupMode)
	}
}

func TestParse_LegacyFlowFlag_Duration(t *testing.T) {
	resetFlags([]string{"cmd", "--flow", "15s"})
	cfg := Parse()
	if cfg.FlushInterval != 15*time.Second {
		t.Fatalf("expected flush=15s via --flow, got %v", cfg.FlushInterval)
	}
}

func TestParse_LegacyFlowFlag_IntegerSeconds(t *testing.T) {
	resetFlags([]string{"cmd", "--flow", "30"})
	cfg := Parse()
	if cfg.FlushInterval != 30*time.Second {
		t.Fatalf("expected flush=30s via --flow integer, got %v", cfg.FlushInterval)
	}
}

func TestParse_LegacyFlowFlag_IgnoredWhenFlushSet(t *testing.T) {
	// If --flush is set explicitly, --flow should be ignored.
	resetFlags([]string{"cmd", "--flush", "20s", "--flow", "30s"})
	cfg := Parse()
	// --flush was set explicitly to 20s, so --flow should be ignored.
	if cfg.FlushInterval != 20*time.Second {
		t.Fatalf("expected flush=20s when --flush explicitly set, got %v", cfg.FlushInterval)
	}
}

func TestParse_LegacyFlowEnv_Duration(t *testing.T) {
	t.Setenv("BYTEROUTE_FLOW", "7s")
	resetFlags([]string{"cmd"})
	cfg := Parse()
	if cfg.FlushInterval != 7*time.Second {
		t.Fatalf("expected flush=7s via BYTEROUTE_FLOW env, got %v", cfg.FlushInterval)
	}
}

func TestParse_LegacyFlowEnv_Integer(t *testing.T) {
	t.Setenv("BYTEROUTE_FLOW", "12")
	resetFlags([]string{"cmd"})
	cfg := Parse()
	if cfg.FlushInterval != 12*time.Second {
		t.Fatalf("expected flush=12s via BYTEROUTE_FLOW integer env, got %v", cfg.FlushInterval)
	}
}
