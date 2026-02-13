package config

import (
	"flag"
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	ListIfaces    bool
	Iface         string
	BPF           string
	Direction     string
	SnapLen       int
	Promisc       bool
	FlushInterval time.Duration
	MaxBatchConns int
	MaxBatchBytes int
	BackendURL    string
	HTTPTimeout   time.Duration
	TenantID      string
	HostID        string
	DedupMode     string // "flow" or "ip"
	IdleTTL       time.Duration
}

func env(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func Parse() Config {
	var cfg Config
	var flowFlag string
	defaultFlush := 5 * time.Second

	flag.BoolVar(&cfg.ListIfaces, "list-ifaces", false, "List network interfaces and exit")

	flag.StringVar(&cfg.Iface, "iface", env("BYTEROUTE_IFACE", ""), "Network interface to capture on (required)")
	flag.StringVar(&cfg.Direction, "direction", env("BYTEROUTE_DIRECTION", "out"), "Capture direction: out, in, or both (used for default BPF)")
	flag.StringVar(&cfg.BPF, "bpf", env("BYTEROUTE_BPF", ""), "BPF filter expression (if empty, a default is generated)")
	flag.IntVar(&cfg.SnapLen, "snaplen", 1600, "pcap snapshot length")
	flag.BoolVar(&cfg.Promisc, "promisc", true, "Enable promiscuous mode")

	flag.DurationVar(&cfg.FlushInterval, "flush", defaultFlush, "Flush interval")
	flag.StringVar(&flowFlag, "flow", env("BYTEROUTE_FLOW", ""), "Legacy alias for --flush (e.g. 5s or 5)")
	flag.IntVar(&cfg.MaxBatchConns, "max-batch-conns", 200, "Max connections per HTTP batch")
	flag.IntVar(&cfg.MaxBatchBytes, "max-batch-bytes", 1500000, "Max JSON payload size per batch (bytes)")

	flag.StringVar(&cfg.BackendURL, "backend", env("BYTEROUTE_BACKEND_URL", "http://localhost:4000"), "Backend base URL")
	flag.DurationVar(&cfg.HTTPTimeout, "http-timeout", 5*time.Second, "HTTP request timeout")
	flag.StringVar(&cfg.TenantID, "tenant-id", env("BYTEROUTE_TENANT_ID", "default"), "Tenant identifier used for multi-tenancy isolation")

	flag.StringVar(&cfg.HostID, "host-id", env("BYTEROUTE_HOST_ID", ""), "Stable host identifier to help de-dup IDs across machines")
	flag.StringVar(&cfg.DedupMode, "dedupe", env("BYTEROUTE_DEDUPE_MODE", "flow"), "Dedup mode: flow or ip")
	flag.DurationVar(&cfg.IdleTTL, "idle-ttl", 2*time.Minute, "Drop flows idle longer than this")

	flag.Parse()

	// Best-effort precedence: if the user set --flush explicitly, keep it;
	// otherwise allow legacy --flow to override the default.
	if flowFlag != "" && cfg.FlushInterval == defaultFlush {
		if d, err := time.ParseDuration(flowFlag); err == nil {
			cfg.FlushInterval = d
		} else if secs, err := strconv.Atoi(flowFlag); err == nil {
			cfg.FlushInterval = time.Duration(secs) * time.Second
		} else {
			fmt.Fprintf(os.Stderr, "invalid --flow value %q (expected duration like 5s or integer seconds like 5)\n", flowFlag)
			os.Exit(2)
		}
	}
	return cfg
}
