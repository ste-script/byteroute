/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package backend

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

const testJWTWithTenantID = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ0ZW5hbnRJZCI6InRlbmFudC1hIiwidGVuYW50SWRzIjpbInRlbmFudC1hIiwidGVuYW50LWIiXX0."

const testJWTWithTenantIDsOnly = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ0ZW5hbnRJZHMiOlsidGVuYW50LWEiLCJ0ZW5hbnQtYiJdfQ."

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
		if got := r.Header.Get("Authorization"); got != "Bearer "+testJWTWithTenantID {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if got := r.Header.Get("X-Tenant-Id"); got != "tenant-a" {
			w.WriteHeader(http.StatusBadRequest)
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

	c, err := NewClient(ts.URL, 2*time.Second, testJWTWithTenantID)
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

func TestNewClient_InvalidURL(t *testing.T) {
	_, err := NewClient("://bad-url", 2*time.Second, "")
	if err == nil {
		t.Fatalf("expected error for invalid URL")
	}
}

func TestClient_PostConnections_Non202(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("server error"))
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, "")
	_, err := c.PostConnections(context.Background(), []Connection{
		{ID: "a", StartTime: "2024-01-01T00:00:00Z", LastActivity: "2024-01-01T00:00:01Z"},
	})
	if err == nil {
		t.Fatalf("expected error on non-202 response")
	}
}

func TestClient_PostConnections_InvalidJSON(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte("not-json"))
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, "")
	resp, err := c.PostConnections(context.Background(), []Connection{
		{ID: "a", StartTime: "2024-01-01T00:00:00Z", LastActivity: "2024-01-01T00:00:01Z"},
	})
	// Should fall back to default response, not error
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Received != 1 {
		t.Fatalf("expected received=1, got %d", resp.Received)
	}
}

func TestClient_PostConnections_NoAuth(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if r.Header.Get("X-Tenant-Id") != "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(AcceptedResponse{Received: 0, Status: "processing"})
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, "")
	_, err := c.PostConnections(context.Background(), []Connection{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClient_PostMetrics(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.URL.Path != "/api/metrics" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if got := r.Header.Get("Authorization"); got != "Bearer "+testJWTWithTenantID {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if got := r.Header.Get("X-Tenant-Id"); got != "tenant-a" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		var payload MetricsPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if len(payload.Snapshots) != 1 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(AcceptedResponse{Received: 1, Status: "processing"})
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, testJWTWithTenantID)
	resp, err := c.PostMetrics(context.Background(), []MetricsSnapshot{
		{Timestamp: "2024-01-01T00:00:00Z", Connections: 5, BandwidthIn: 1000, BandwidthOut: 2000, Inactive: 1},
	})
	if err != nil {
		t.Fatalf("PostMetrics: %v", err)
	}
	if resp.Received != 1 {
		t.Fatalf("expected received=1, got %d", resp.Received)
	}
}

func TestClient_PostMetrics_Non202(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("bad request"))
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, "")
	_, err := c.PostMetrics(context.Background(), []MetricsSnapshot{})
	if err == nil {
		t.Fatalf("expected error on non-202 response")
	}
}

func TestClient_PostMetrics_InvalidJSON(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte("not-json"))
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, "")
	resp, err := c.PostMetrics(context.Background(), []MetricsSnapshot{
		{Timestamp: "2024-01-01T00:00:00Z"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "processing" {
		t.Fatalf("expected fallback status=processing, got %q", resp.Status)
	}
}

func TestClient_UsesFirstTenantIDWhenPrimaryClaimMissing(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-Id"); got != "tenant-a" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(AcceptedResponse{Received: 0, Status: "processing"})
	}))
	defer ts.Close()

	c, _ := NewClient(ts.URL, 2*time.Second, testJWTWithTenantIDsOnly)
	_, err := c.PostConnections(context.Background(), []Connection{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
