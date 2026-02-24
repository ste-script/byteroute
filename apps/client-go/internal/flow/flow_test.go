package flow

import (
	"net"
	"testing"
	"time"
)

func TestAggregator_DirectionAccounting(t *testing.T) {
	localIPs := map[string]struct{}{"10.0.0.1": {}}
	agg := New("host", "flow", 0, localIPs)

	now := time.Now()
	agg.Update(now, net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 100)
	agg.Update(now.Add(10*time.Millisecond), net.ParseIP("8.8.8.8"), net.ParseIP("10.0.0.1"), 53, 1234, "UDP", 60)

	batch, keys := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected 1 flow, got %d", len(batch))
	}
	if len(keys) != 1 {
		t.Fatalf("expected 1 key")
	}

	if batch[0].BytesOut == nil || *batch[0].BytesOut != 100 {
		t.Fatalf("expected bytesOut=100")
	}
	if batch[0].BytesIn == nil || *batch[0].BytesIn != 60 {
		t.Fatalf("expected bytesIn=60")
	}

	agg.Ack(keys)
	batch2, _ := agg.ExportBatch(10)
	if len(batch2) != 0 {
		t.Fatalf("expected no dirty flows after ack")
	}
}

func TestAggregator_DedupeByIP(t *testing.T) {
	agg := New("host", "ip", 0, nil)

	now := time.Now()
	// Different ports but same src/dst should dedupe into one when dedupe=ip
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 1111, 80, "TCP", 10)
	agg.Update(now.Add(1*time.Millisecond), net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 2222, 443, "TCP", 20)

	batch, _ := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected 1 flow, got %d", len(batch))
	}
}

func TestAggregator_DoesNotReExportWithinInterval(t *testing.T) {
	localIPs := map[string]struct{}{"10.0.0.1": {}}
	agg := New("host", "flow", 0, localIPs)

	now := time.Now()
	agg.Update(now, net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 100)

	batch, keys := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected 1 flow, got %d", len(batch))
	}
	agg.Ack(keys)

	// More traffic arrives for the same flow during the same flush tick.
	agg.Update(now.Add(10*time.Millisecond), net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 50)

	// Without ResetPending, the flow should not be exported again in this interval.
	batch2, _ := agg.ExportBatch(10)
	if len(batch2) != 0 {
		t.Fatalf("expected no export before ResetPending, got %d", len(batch2))
	}

	// Next interval: allow re-export.
	agg.ResetPending()
	batch3, _ := agg.ExportBatch(10)
	if len(batch3) != 1 {
		t.Fatalf("expected export after ResetPending, got %d", len(batch3))
	}
}

func TestAggregator_ExportBatch_MaxZero(t *testing.T) {
	agg := New("host", "flow", 0, nil)
	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	batch, keys := agg.ExportBatch(0)
	if batch != nil || keys != nil {
		t.Fatalf("expected nil batch/keys for max=0")
	}
}

func TestAggregator_Nack_AllowsRetry(t *testing.T) {
	agg := New("host", "flow", 0, nil)
	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	// Export puts the flow in pending state.
	_, keys := agg.ExportBatch(10)
	if len(keys) != 1 {
		t.Fatalf("expected 1 key")
	}

	// Without Nack, a second export returns nothing (still pending).
	batch2, _ := agg.ExportBatch(10)
	if len(batch2) != 0 {
		t.Fatalf("expected 0 flows while pending, got %d", len(batch2))
	}

	// After Nack, the flow is retryable.
	agg.Nack(keys)
	batch3, _ := agg.ExportBatch(10)
	if len(batch3) != 1 {
		t.Fatalf("expected 1 flow after nack, got %d", len(batch3))
	}
}

func TestAggregator_Prune_MarksInactive(t *testing.T) {
	ttl := 50 * time.Millisecond
	agg := New("host", "flow", ttl, nil)

	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	// Export and ack to clear dirty state.
	_, keys := agg.ExportBatch(10)
	agg.Ack(keys)
	agg.ResetPending()

	// No traffic for longer than idleTTL - prune marks it inactive and dirty.
	time.Sleep(60 * time.Millisecond)
	agg.Prune(time.Now())

	batch, _ := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected dirty inactive flow to be exported, got %d", len(batch))
	}
	if batch[0].Status != "inactive" {
		t.Fatalf("expected status=inactive, got %q", batch[0].Status)
	}
}

func TestAggregator_Prune_DeletesAfter2xTTL(t *testing.T) {
	ttl := 20 * time.Millisecond
	agg := New("host", "flow", ttl, nil)

	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	// Wait past 2x TTL
	time.Sleep(50 * time.Millisecond)
	agg.Prune(time.Now())

	// Flow should be gone.
	agg.ResetPending()
	batch, _ := agg.ExportBatch(10)
	if len(batch) != 0 {
		t.Fatalf("expected 0 flows after 2x TTL prune, got %d", len(batch))
	}
}

func TestAggregator_Prune_NoTTL(t *testing.T) {
	// idleTTL=0 means prune is a no-op
	agg := New("host", "flow", 0, nil)
	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	// Should not panic and should not remove the flow.
	agg.Prune(time.Now().Add(24 * time.Hour))

	agg.ResetPending()
	batch, _ := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected flow to still exist when ttl=0, got %d", len(batch))
	}
}

func TestAggregator_ActiveStatusAfterReactivation(t *testing.T) {
	ttl := 20 * time.Millisecond
	agg := New("host", "flow", ttl, nil)

	now := time.Now()
	agg.Update(now, net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 100)

	// Prune marks it inactive.
	time.Sleep(30 * time.Millisecond)
	agg.Prune(time.Now())

	// New traffic arrives - flow should become active again.
	agg.Update(time.Now(), net.ParseIP("1.2.3.4"), net.ParseIP("5.6.7.8"), 100, 80, "TCP", 50)

	agg.ResetPending()
	batch, _ := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected 1 flow after reactivation")
	}
	if batch[0].Status != "active" {
		t.Fatalf("expected status=active after reactivation, got %q", batch[0].Status)
	}
}

func TestAggregator_PacketCounts(t *testing.T) {
	localIPs := map[string]struct{}{"10.0.0.1": {}}
	agg := New("host", "flow", 0, localIPs)

	now := time.Now()
	// 3 outbound packets
	agg.Update(now, net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 100)
	agg.Update(now.Add(1*time.Millisecond), net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 100)
	agg.Update(now.Add(2*time.Millisecond), net.ParseIP("10.0.0.1"), net.ParseIP("8.8.8.8"), 1234, 53, "UDP", 100)
	// 2 inbound packets
	agg.Update(now.Add(3*time.Millisecond), net.ParseIP("8.8.8.8"), net.ParseIP("10.0.0.1"), 53, 1234, "UDP", 60)
	agg.Update(now.Add(4*time.Millisecond), net.ParseIP("8.8.8.8"), net.ParseIP("10.0.0.1"), 53, 1234, "UDP", 60)

	batch, _ := agg.ExportBatch(10)
	if len(batch) != 1 {
		t.Fatalf("expected 1 flow, got %d", len(batch))
	}
	if *batch[0].PacketsOut != 3 {
		t.Fatalf("expected packetsOut=3, got %d", *batch[0].PacketsOut)
	}
	if *batch[0].PacketsIn != 2 {
		t.Fatalf("expected packetsIn=2, got %d", *batch[0].PacketsIn)
	}
	if *batch[0].BytesOut != 300 {
		t.Fatalf("expected bytesOut=300, got %d", *batch[0].BytesOut)
	}
	if *batch[0].BytesIn != 120 {
		t.Fatalf("expected bytesIn=120, got %d", *batch[0].BytesIn)
	}
}
