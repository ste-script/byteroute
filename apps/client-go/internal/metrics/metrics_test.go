package metrics

import (
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	tests := []struct {
		name         string
		maxSnapshots int
		want         int
	}{
		{"positive limit", 100, 100},
		{"zero defaults to 168", 0, 168},
		{"negative defaults to 168", -5, 168},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := New(tt.maxSnapshots)
			if c.maxSnapshots != tt.want {
				t.Errorf("New(%d).maxSnapshots = %d, want %d", tt.maxSnapshots, c.maxSnapshots, tt.want)
			}
		})
	}
}

func TestRecordConnection(t *testing.T) {
	tests := []struct {
		name             string
		records          []struct {
			id       string
			bytesIn  int64
			bytesOut int64
			inactive bool
		}
		wantConnections  int
		wantBytesIn      int64
		wantBytesOut     int64
		wantInactiveCount int
	}{
		{
			name: "single active connection",
			records: []struct {
				id       string
				bytesIn  int64
				bytesOut int64
				inactive bool
			}{
				{"conn1", 100, 200, false},
			},
			wantConnections:  1,
			wantBytesIn:      100,
			wantBytesOut:     200,
			wantInactiveCount: 0,
		},
		{
			name: "single inactive connection",
			records: []struct {
				id       string
				bytesIn  int64
				bytesOut int64
				inactive bool
			}{
				{"conn1", 100, 200, true},
			},
			wantConnections:  1,
			wantBytesIn:      100,
			wantBytesOut:     200,
			wantInactiveCount: 1,
		},
		{
			name: "multiple connections with duplicates",
			records: []struct {
				id       string
				bytesIn  int64
				bytesOut int64
				inactive bool
			}{
				{"conn1", 100, 200, false},
				{"conn2", 50, 75, true},
				{"conn1", 25, 30, false}, // Same ID, should not increase connection count
			},
			wantConnections:  2,
			wantBytesIn:      175,
			wantBytesOut:     305,
			wantInactiveCount: 1,
		},
		{
			name: "accumulates bandwidth across records",
			records: []struct {
				id       string
				bytesIn  int64
				bytesOut int64
				inactive bool
			}{
				{"conn1", 1000, 2000, false},
				{"conn2", 500, 750, false},
				{"conn3", 250, 125, true},
			},
			wantConnections:  3,
			wantBytesIn:      1750,
			wantBytesOut:     2875,
			wantInactiveCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := New(10)

			for _, rec := range tt.records {
				c.RecordConnection(rec.id, rec.bytesIn, rec.bytesOut, rec.inactive)
			}

			snapshot := c.GetCurrentMetrics()

			if snapshot.Connections != tt.wantConnections {
				t.Errorf("Connections = %d, want %d", snapshot.Connections, tt.wantConnections)
			}
			if snapshot.BandwidthIn != tt.wantBytesIn {
				t.Errorf("BandwidthIn = %d, want %d", snapshot.BandwidthIn, tt.wantBytesIn)
			}
			if snapshot.BandwidthOut != tt.wantBytesOut {
				t.Errorf("BandwidthOut = %d, want %d", snapshot.BandwidthOut, tt.wantBytesOut)
			}
			if snapshot.Inactive != tt.wantInactiveCount {
				t.Errorf("Inactive = %d, want %d", snapshot.Inactive, tt.wantInactiveCount)
			}
		})
	}
}

func TestTakeSnapshot(t *testing.T) {
	c := New(3)

	// Record some metrics
	c.RecordConnection("conn1", 100, 200, false)
	c.RecordConnection("conn2", 50, 75, true)

	// Take first snapshot
	snap1 := c.TakeSnapshot()

	if snap1.Connections != 2 {
		t.Errorf("snap1.Connections = %d, want 2", snap1.Connections)
	}
	if snap1.BandwidthIn != 150 {
		t.Errorf("snap1.BandwidthIn = %d, want 150", snap1.BandwidthIn)
	}
	if snap1.BandwidthOut != 275 {
		t.Errorf("snap1.BandwidthOut = %d, want 275", snap1.BandwidthOut)
	}
	if snap1.Inactive != 1 {
		t.Errorf("snap1.Inactive = %d, want 1", snap1.Inactive)
	}

	// Verify counters were reset
	current := c.GetCurrentMetrics()
	if current.Connections != 0 {
		t.Errorf("after snapshot, Connections = %d, want 0", current.Connections)
	}
	if current.BandwidthIn != 0 {
		t.Errorf("after snapshot, BandwidthIn = %d, want 0", current.BandwidthIn)
	}
	if current.BandwidthOut != 0 {
		t.Errorf("after snapshot, BandwidthOut = %d, want 0", current.BandwidthOut)
	}
	if current.Inactive != 0 {
		t.Errorf("after snapshot, Inactive = %d, want 0", current.Inactive)
	}

	// Record new metrics and take another snapshot
	c.RecordConnection("conn3", 300, 400, false)
	snap2 := c.TakeSnapshot()

	if snap2.Connections != 1 {
		t.Errorf("snap2.Connections = %d, want 1", snap2.Connections)
	}
	if snap2.BandwidthIn != 300 {
		t.Errorf("snap2.BandwidthIn = %d, want 300", snap2.BandwidthIn)
	}
}

func TestSnapshotRetention(t *testing.T) {
	maxSnapshots := 3
	c := New(maxSnapshots)

	// Take more snapshots than the limit
	for i := 0; i < 5; i++ {
		c.RecordConnection("conn", int64(i*100), int64(i*200), false)
		c.TakeSnapshot()
	}

	snapshots := c.GetSnapshots()
	if len(snapshots) != maxSnapshots {
		t.Errorf("GetSnapshots() length = %d, want %d", len(snapshots), maxSnapshots)
	}

	// Verify we kept the most recent ones (should have bandwidth 200, 300, 400)
	expectedBandwidths := []int64{200, 300, 400}
	for i, snap := range snapshots {
		if snap.BandwidthIn != expectedBandwidths[i] {
			t.Errorf("snapshot[%d].BandwidthIn = %d, want %d", i, snap.BandwidthIn, expectedBandwidths[i])
		}
	}
}

func TestSnapshotTimestamp(t *testing.T) {
	before := time.Now()
	c := New(10)

	time.Sleep(10 * time.Millisecond)
	c.RecordConnection("conn1", 100, 200, false)
	snap := c.TakeSnapshot()

	time.Sleep(10 * time.Millisecond)
	after := time.Now()

	// Snapshot timestamp should be close to when the collector was created
	// Allow some tolerance for test execution time
	if snap.Timestamp.Before(before.Add(-100 * time.Millisecond)) {
		t.Errorf("Snapshot timestamp %v is too far before test start %v", snap.Timestamp, before)
	}
	if snap.Timestamp.After(after) {
		t.Errorf("Snapshot timestamp %v is after test end %v", snap.Timestamp, after)
	}
}

func TestConcurrentRecording(t *testing.T) {
	c := New(100)
	done := make(chan bool)

	// Concurrently record from multiple goroutines
	for i := 0; i < 10; i++ {
		go func(id int) {
			for j := 0; j < 100; j++ {
				c.RecordConnection("conn", 10, 20, false)
			}
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	snap := c.TakeSnapshot()

	// Should have recorded 1000 updates (10 goroutines * 100 each)
	expectedBytes := int64(10 * 100 * 10)
	if snap.BandwidthIn != expectedBytes {
		t.Errorf("Concurrent recording: BandwidthIn = %d, want %d", snap.BandwidthIn, expectedBytes)
	}

	expectedBytesOut := int64(10 * 100 * 20)
	if snap.BandwidthOut != expectedBytesOut {
		t.Errorf("Concurrent recording: BandwidthOut = %d, want %d", snap.BandwidthOut, expectedBytesOut)
	}
}

func TestGetCurrentMetrics(t *testing.T) {
	c := New(10)

	// Initially empty
	current := c.GetCurrentMetrics()
	if current.Connections != 0 {
		t.Errorf("initial Connections = %d, want 0", current.Connections)
	}

	// Record some data
	c.RecordConnection("conn1", 100, 200, false)
	c.RecordConnection("conn2", 50, 75, true)

	current = c.GetCurrentMetrics()
	if current.Connections != 2 {
		t.Errorf("Connections = %d, want 2", current.Connections)
	}
	if current.BandwidthIn != 150 {
		t.Errorf("BandwidthIn = %d, want 150", current.BandwidthIn)
	}
	if current.Inactive != 1 {
		t.Errorf("Inactive = %d, want 1", current.Inactive)
	}

	// GetCurrentMetrics should not reset counters
	current2 := c.GetCurrentMetrics()
	if current2.Connections != 2 {
		t.Errorf("second call Connections = %d, want 2", current2.Connections)
	}
}
