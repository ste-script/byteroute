package config

import (
	"flag"
	"os"
	"time"
)

type Config struct {
	ListIfaces    bool
	Iface         string
	BPF           string
	Direction     string
	ReporterIP    string
	SnapLen       int
	Promisc       bool
	FlushInterval time.Duration
	MaxBatchConns int
	MaxBatchBytes int
	BackendURL    string
	HTTPTimeout   time.Duration
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

	flag.BoolVar(&cfg.ListIfaces, "list-ifaces", false, "List network interfaces and exit")

	flag.StringVar(&cfg.Iface, "iface", env("BYTEROUTE_IFACE", ""), "Network interface to capture on (required)")
	flag.StringVar(&cfg.Direction, "direction", env("BYTEROUTE_DIRECTION", "out"), "Capture direction: out, in, or both (used for default BPF)")
	flag.StringVar(&cfg.BPF, "bpf", env("BYTEROUTE_BPF", ""), "BPF filter expression (if empty, a default is generated)")
	flag.StringVar(&cfg.ReporterIP, "reporter-ip", env("BYTEROUTE_REPORTER_IP", ""), "Public/WAN IP of this sensor; used to geo-locate private source networks")
	flag.IntVar(&cfg.SnapLen, "snaplen", 1600, "pcap snapshot length")
	flag.BoolVar(&cfg.Promisc, "promisc", true, "Enable promiscuous mode")

	flag.DurationVar(&cfg.FlushInterval, "flush", 5*time.Second, "Flush interval")
	flag.IntVar(&cfg.MaxBatchConns, "max-batch-conns", 200, "Max connections per HTTP batch")
	flag.IntVar(&cfg.MaxBatchBytes, "max-batch-bytes", 1500000, "Max JSON payload size per batch (bytes)")

	flag.StringVar(&cfg.BackendURL, "backend", env("BYTEROUTE_BACKEND_URL", "http://localhost:4000"), "Backend base URL")
	flag.DurationVar(&cfg.HTTPTimeout, "http-timeout", 5*time.Second, "HTTP request timeout")

	flag.StringVar(&cfg.HostID, "host-id", env("BYTEROUTE_HOST_ID", ""), "Stable host identifier to help de-dup IDs across machines")
	flag.StringVar(&cfg.DedupMode, "dedupe", env("BYTEROUTE_DEDUPE_MODE", "flow"), "Dedup mode: flow or ip")
	flag.DurationVar(&cfg.IdleTTL, "idle-ttl", 2*time.Minute, "Drop flows idle longer than this")

	flag.Parse()
	return cfg
}
