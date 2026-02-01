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
