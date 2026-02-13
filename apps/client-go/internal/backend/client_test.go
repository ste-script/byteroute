package backend

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClient_PostConnections(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.URL.Path != "/api/connections" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-a" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		var payload ConnectionsPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if len(payload.Connections) != 2 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(AcceptedResponse{Received: len(payload.Connections), Status: "processing"})
	}))
	defer ts.Close()

	c, err := NewClient(ts.URL, 2*time.Second, "tenant-a")
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	resp, err := c.PostConnections(ctx, []Connection{
		{ID: "a", SourceIP: "1.1.1.1", DestIP: "8.8.8.8", SourcePort: 1, DestPort: 2, Protocol: "TCP", Status: "active", StartTime: time.Now().UTC().Format(time.RFC3339Nano), LastActivity: time.Now().UTC().Format(time.RFC3339Nano)},
		{ID: "b", SourceIP: "1.1.1.1", DestIP: "8.8.8.8", SourcePort: 1, DestPort: 2, Protocol: "TCP", Status: "active", StartTime: time.Now().UTC().Format(time.RFC3339Nano), LastActivity: time.Now().UTC().Format(time.RFC3339Nano)},
	})
	if err != nil {
		t.Fatalf("PostConnections: %v", err)
	}
	if resp.Received != 2 {
		t.Fatalf("expected received=2, got %d", resp.Received)
	}
	if resp.Status == "" {
		t.Fatalf("expected status")
	}
}
