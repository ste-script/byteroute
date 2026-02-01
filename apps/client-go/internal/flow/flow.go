package flow

import (
	"encoding/json"
	"net"
	"sort"
	"sync"
	"time"

	"github.com/byteroute/client-go/internal/backend"
	"github.com/byteroute/client-go/internal/util"
)

type Key struct {
	SrcIP    string
	DstIP    string
	SrcPort  uint16
	DstPort  uint16
	Protocol string
}

type entry struct {
	key        Key
	id         string
	firstSeen  time.Time
	lastSeen   time.Time
	bytesIn    int64
	bytesOut   int64
	packetsIn  int64
	packetsOut int64
	dirty      bool
	pending    bool
}

type Aggregator struct {
	hostID   string
	dedup    string
	idleTTL  time.Duration
	localIPs map[string]struct{}

	mu    sync.Mutex
	flows map[Key]*entry
}

func New(hostID, dedupMode string, idleTTL time.Duration, localIPs map[string]struct{}) *Aggregator {
	if localIPs == nil {
		localIPs = map[string]struct{}{}
	}
	return &Aggregator{
		hostID:   hostID,
		dedup:    dedupMode,
		idleTTL:  idleTTL,
		localIPs: localIPs,
		flows:    map[Key]*entry{},
	}
}

func (a *Aggregator) keyFor(srcIP, dstIP net.IP, srcPort, dstPort uint16, proto string) Key {
	src := srcIP.String()
	dst := dstIP.String()

	// Canonicalize so traffic in both directions maps to the same key.
	// If exactly one side is local, always store it as SrcIP ("local" -> "remote").
	_, srcLocal := a.localIPs[src]
	_, dstLocal := a.localIPs[dst]
	if dstLocal && !srcLocal {
		src, dst = dst, src
		srcPort, dstPort = dstPort, srcPort
	}

	k := Key{SrcIP: src, DstIP: dst, SrcPort: srcPort, DstPort: dstPort, Protocol: proto}
	if a.dedup == "ip" {
		k.SrcPort = 0
		k.DstPort = 0
	}
	return k
}

func (a *Aggregator) Update(ts time.Time, srcIP, dstIP net.IP, srcPort, dstPort uint16, proto string, length int) {
	k := a.keyFor(srcIP, dstIP, srcPort, dstPort, proto)

	a.mu.Lock()
	defer a.mu.Unlock()

	e := a.flows[k]
	if e == nil {
		id := util.StableID(a.hostID, k.Protocol, k.SrcIP, k.DstIP, k.SrcPort, k.DstPort)
		e = &entry{key: k, id: id, firstSeen: ts, lastSeen: ts, dirty: true}
		a.flows[k] = e
	} else {
		e.lastSeen = ts
		e.dirty = true
	}

	// Direction is based on the original packet direction (pre-canonicalization).
	_, srcLocal := a.localIPs[srcIP.String()]
	if srcLocal {
		e.bytesOut += int64(length)
		e.packetsOut++
	} else {
		e.bytesIn += int64(length)
		e.packetsIn++
	}
}

func (a *Aggregator) Prune(now time.Time) {
	if a.idleTTL <= 0 {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	for k, e := range a.flows {
		if now.Sub(e.lastSeen) > a.idleTTL {
			delete(a.flows, k)
		}
	}
}

// ExportBatch returns up to max items to send.
// It marks selected entries as pending so they won't be selected again until Ack/Nack.
func (a *Aggregator) ExportBatch(max int) ([]backend.Connection, []Key) {
	if max <= 0 {
		return nil, nil
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	keys := make([]Key, 0, len(a.flows))
	for k, e := range a.flows {
		if e.dirty && !e.pending {
			keys = append(keys, k)
		}
	}

	// stable ordering for deterministic behavior
	sort.Slice(keys, func(i, j int) bool {
		aBytes, _ := json.Marshal(keys[i])
		bBytes, _ := json.Marshal(keys[j])
		return string(aBytes) < string(bBytes)
	})

	if len(keys) > max {
		keys = keys[:max]
	}

	out := make([]backend.Connection, 0, len(keys))
	picked := make([]Key, 0, len(keys))

	for _, k := range keys {
		e := a.flows[k]
		if e == nil {
			continue
		}
		e.pending = true

		start := e.firstSeen.UTC().Format(time.RFC3339Nano)
		last := e.lastSeen.UTC().Format(time.RFC3339Nano)
		dur := int64(e.lastSeen.Sub(e.firstSeen).Milliseconds())
		bytesIn := e.bytesIn
		bytesOut := e.bytesOut
		packetsIn := e.packetsIn
		packetsOut := e.packetsOut

		c := backend.Connection{
			ID:           e.id,
			SourceIP:     e.key.SrcIP,
			DestIP:       e.key.DstIP,
			SourcePort:   int(e.key.SrcPort),
			DestPort:     int(e.key.DstPort),
			Protocol:     e.key.Protocol,
			Status:       "active",
			StartTime:    start,
			LastActivity: last,
			DurationMs:   &dur,
			BytesIn:      &bytesIn,
			BytesOut:     &bytesOut,
			PacketsIn:    &packetsIn,
			PacketsOut:   &packetsOut,
		}

		out = append(out, c)
		picked = append(picked, k)
	}

	return out, picked
}

func (a *Aggregator) Ack(keys []Key) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, k := range keys {
		if e := a.flows[k]; e != nil {
			e.pending = false
			e.dirty = false
		}
	}
}

func (a *Aggregator) Nack(keys []Key) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, k := range keys {
		if e := a.flows[k]; e != nil {
			e.pending = false
			// keep dirty=true so we retry
		}
	}
}
