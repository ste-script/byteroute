package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/byteroute/client-go/internal/backend"
	"github.com/byteroute/client-go/internal/capture"
	"github.com/byteroute/client-go/internal/config"
	"github.com/byteroute/client-go/internal/flow"
)

func main() {
	cfg := config.Parse()
	if cfg.ListIfaces {
		ifaces, err := capture.ListIfaces()
		if err != nil {
			log.Fatalf("list ifaces: %v", err)
		}
		for _, i := range ifaces {
			fmt.Printf("%s\n", i.Name)
		}
		return
	}
	if cfg.Iface == "" {
		fmt.Fprintln(os.Stderr, "--iface is required")
		os.Exit(2)
	}

	localIPs, err := capture.LocalIPsForInterface(cfg.Iface)
	if err != nil {
		log.Printf("warn: could not resolve local IPs for iface %q: %v", cfg.Iface, err)
		localIPs = map[string]struct{}{}
	}

	// Default BPF: focus on outbound/inbound using local IPv4s if available.
	bpf := cfg.BPF
	if bpf == "" {
		bpf = capture.BuildDefaultBPF("tcp or udp or icmp", cfg.Direction, localIPs)
	}

	agg := flow.New(cfg.HostID, cfg.DedupMode, cfg.IdleTTL, localIPs)

	handle, packets, err := capture.Start(cfg.Iface, bpf, cfg.SnapLen, cfg.Promisc)
	if err != nil {
		log.Fatalf("capture start: %v", err)
	}
	defer handle.Close()

	bc, err := backend.NewClient(cfg.BackendURL, cfg.HTTPTimeout)
	if err != nil {
		log.Fatalf("backend client: %v", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log.Printf(
		"byteroute-client: iface=%s direction=%s bpf=%q backend=%s flush=%s dedupe=%s",
		cfg.Iface,
		cfg.Direction,
		bpf,
		cfg.BackendURL,
		cfg.FlushInterval,
		cfg.DedupMode,
	)

	go func() {
		for ev := range packets {
			agg.Update(ev.Timestamp, ev.SrcIP, ev.DstIP, ev.SrcPort, ev.DstPort, ev.Protocol, ev.Length)
		}
		cancel()
	}()

	ticker := time.NewTicker(cfg.FlushInterval)
	defer ticker.Stop()

	backoff := 250 * time.Millisecond

	for {
		select {
		case <-ctx.Done():
			log.Printf("shutting down")
			return
		case t := <-ticker.C:
			agg.Prune(t)

			for {
				batch, keys := agg.ExportBatch(cfg.MaxBatchConns)
				if len(batch) == 0 {
					break
				}

				batch, keys = enforceMaxBytes(batch, keys, cfg.MaxBatchBytes)
				if len(batch) == 0 {
					break
				}

				reqCtx, cancelReq := context.WithTimeout(ctx, cfg.HTTPTimeout)
				_, err := bc.PostConnections(reqCtx, batch)
				cancelReq()

				if err != nil {
					agg.Nack(keys)
					log.Printf("post batch failed (will retry): %v", err)
					select {
					case <-time.After(backoff):
						backoff = minDuration(backoff*2, 5*time.Second)
					case <-ctx.Done():
						return
					}
					break
				}

				backoff = 250 * time.Millisecond
				agg.Ack(keys)
				log.Printf("posted %d connections", len(batch))
			}
		}
	}
}

func minDuration(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}

func enforceMaxBytes(batch []backend.Connection, keys []flow.Key, maxBytes int) ([]backend.Connection, []flow.Key) {
	if maxBytes <= 0 {
		return batch, keys
	}

	// Fast path: check if full batch fits.
	payload := backend.ConnectionsPayload{Connections: batch}
	b, err := json.Marshal(payload)
	if err == nil && len(b) <= maxBytes {
		return batch, keys
	}

	// Reduce until it fits.
	lo := 0
	hi := len(batch)
	best := 0

	for lo <= hi {
		mid := (lo + hi) / 2
		payload := backend.ConnectionsPayload{Connections: batch[:mid]}
		bb, e := json.Marshal(payload)
		if e != nil {
			// fall back to linear reduction
			break
		}
		if len(bb) <= maxBytes {
			best = mid
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}

	if best > 0 {
		return batch[:best], keys[:best]
	}

	// Last resort: try single item
	if len(batch) > 0 {
		payload := backend.ConnectionsPayload{Connections: batch[:1]}
		bb, e := json.Marshal(payload)
		if e == nil && len(bb) <= maxBytes {
			return batch[:1], keys[:1]
		}
	}

	// Cannot fit even one item; drop and surface via error elsewhere.
	_ = errors.New("payload too large")
	return nil, nil
}
