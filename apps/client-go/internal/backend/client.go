package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	baseURL  *url.URL
	hc       *http.Client
	tenantID string
}

func NewClient(baseURL string, timeout time.Duration, tenantID string) (*Client, error) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, err
	}

	return &Client{
		baseURL: u,
		hc: &http.Client{
			Timeout: timeout,
		},
		tenantID: tenantID,
	}, nil
}

func (c *Client) PostConnections(ctx context.Context, connections []Connection) (*AcceptedResponse, error) {
	endpoint := c.baseURL.ResolveReference(&url.URL{Path: "/api/connections"})

	payload := ConnectionsPayload{Connections: connections}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.tenantID != "" {
		req.Header.Set("X-Tenant-ID", c.tenantID)
	}

	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("backend returned %d: %s", resp.StatusCode, string(respBody))
	}

	var accepted AcceptedResponse
	if err := json.Unmarshal(respBody, &accepted); err != nil {
		// Backend always returns JSON today, but don't fail hard if it changes.
		return &AcceptedResponse{Received: len(connections), Status: "processing"}, nil
	}

	return &accepted, nil
}

func (c *Client) PostMetrics(ctx context.Context, snapshots []MetricsSnapshot) (*AcceptedResponse, error) {
	endpoint := c.baseURL.ResolveReference(&url.URL{Path: "/api/metrics"})

	payload := MetricsPayload{Snapshots: snapshots}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.tenantID != "" {
		req.Header.Set("X-Tenant-ID", c.tenantID)
	}

	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("backend returned %d: %s", resp.StatusCode, string(respBody))
	}

	var accepted AcceptedResponse
	if err := json.Unmarshal(respBody, &accepted); err != nil {
		// Backend always returns JSON today, but don't fail hard if it changes.
		return &AcceptedResponse{Received: len(snapshots), Status: "processing"}, nil
	}

	return &accepted, nil
}
