package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL  *url.URL
	hc       *http.Client
	tenantID string
	authToken string
}

func NewClient(baseURL string, timeout time.Duration, tenantID string, authToken string) (*Client, error) {
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
		authToken: strings.TrimSpace(authToken),
	}, nil
}

func (c *Client) applyAuth(req *http.Request) {
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
}

func (c *Client) authorizedForTenant(ctx context.Context) error {
	if c.tenantID == "" {
		return nil
	}

	endpoint := c.baseURL.ResolveReference(&url.URL{Path: "/api/tenants"})
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return err
	}
	c.applyAuth(req)

	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("tenant authorization check failed: backend returned %d: %s", resp.StatusCode, string(respBody))
	}

	var payload struct {
		Tenants []string `json:"tenants"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return fmt.Errorf("tenant authorization check failed: invalid response: %w", err)
	}

	for _, tenantID := range payload.Tenants {
		if strings.TrimSpace(tenantID) == c.tenantID {
			return nil
		}
	}

	return fmt.Errorf("tenant %q is not authorized for current identity", c.tenantID)
}

func (c *Client) PostConnections(ctx context.Context, connections []Connection) (*AcceptedResponse, error) {
	if err := c.authorizedForTenant(ctx); err != nil {
		return nil, err
	}

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
	c.applyAuth(req)
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
	if err := c.authorizedForTenant(ctx); err != nil {
		return nil, err
	}

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
	c.applyAuth(req)
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
