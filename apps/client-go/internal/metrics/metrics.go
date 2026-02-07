package metrics

import (
	"sync"
	"time"
)

// Snapshot represents aggregated metrics for a time period
type Snapshot struct {
	Timestamp    time.Time `json:"timestamp"`
	Connections  int       `json:"connections"`
	BandwidthIn  int64     `json:"bandwidthIn"`
	BandwidthOut int64     `json:"bandwidthOut"`
	Blocked      int       `json:"blocked"`
	Inactive     int       `json:"inactive"`
}

// Collector aggregates network interface metrics over time
type Collector struct {
	mu sync.Mutex

	// Current period metrics
	startTime      time.Time
	activeConns    map[string]struct{} // Track unique connection IDs
	totalBytesIn   int64
	totalBytesOut  int64
	blockedCount   int
	inactiveCount  int

	// Historical snapshots
	snapshots      []Snapshot
	maxSnapshots   int
}

// New creates a new metrics collector
func New(maxSnapshots int) *Collector {
	if maxSnapshots <= 0 {
		maxSnapshots = 168 // 7 days of hourly data
	}
	return &Collector{
		startTime:    time.Now(),
		activeConns:  make(map[string]struct{}),
		snapshots:    make([]Snapshot, 0, maxSnapshots),
		maxSnapshots: maxSnapshots,
	}
}

// RecordConnection records metrics for a connection
func (c *Collector) RecordConnection(connID string, bytesIn, bytesOut int64, blocked, inactive bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.activeConns[connID] = struct{}{}
	c.totalBytesIn += bytesIn
	c.totalBytesOut += bytesOut

	if blocked {
		c.blockedCount++
	}
	if inactive {
		c.inactiveCount++
	}
}

// TakeSnapshot captures current metrics and resets counters
func (c *Collector) TakeSnapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	snapshot := Snapshot{
		Timestamp:    c.startTime,
		Connections:  len(c.activeConns),
		BandwidthIn:  c.totalBytesIn,
		BandwidthOut: c.totalBytesOut,
		Blocked:      c.blockedCount,
		Inactive:     c.inactiveCount,
	}

	// Store snapshot
	c.snapshots = append(c.snapshots, snapshot)

	// Trim if exceeding max
	if len(c.snapshots) > c.maxSnapshots {
		c.snapshots = c.snapshots[len(c.snapshots)-c.maxSnapshots:]
	}

	// Reset counters for next period
	c.startTime = time.Now()
	c.activeConns = make(map[string]struct{})
	c.totalBytesIn = 0
	c.totalBytesOut = 0
	c.blockedCount = 0
	c.inactiveCount = 0

	return snapshot
}

// GetSnapshots returns all collected snapshots
func (c *Collector) GetSnapshots() []Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	result := make([]Snapshot, len(c.snapshots))
	copy(result, c.snapshots)
	return result
}

// GetCurrentMetrics returns the current period's metrics without taking a snapshot
func (c *Collector) GetCurrentMetrics() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	return Snapshot{
		Timestamp:    c.startTime,
		Connections:  len(c.activeConns),
		BandwidthIn:  c.totalBytesIn,
		BandwidthOut: c.totalBytesOut,
		Blocked:      c.blockedCount,
		Inactive:     c.inactiveCount,
	}
}
