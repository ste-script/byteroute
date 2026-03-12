package backend

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL   *url.URL
	hc        *http.Client
	authToken string
	tenantID  string
}

type authTokenClaims struct {
	TenantID  string   `json:"tenantId"`
	TenantIDs []string `json:"tenantIds"`
}

func NewClient(baseURL string, timeout time.Duration, authToken string) (*Client, error) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, err
	}

	return &Client{
		baseURL: u,
		hc: &http.Client{
			Timeout: timeout,
		},
		authToken: strings.TrimSpace(authToken),
		tenantID:  extractTenantIDFromToken(authToken),
	}, nil
}

func (c *Client) applyAuth(req *http.Request) {
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	if c.tenantID != "" {
		req.Header.Set("X-Tenant-Id", c.tenantID)
	}
}

func extractTenantIDFromToken(token string) string {
	token = strings.TrimSpace(token)
	if token == "" {
		return ""
	}

	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	var claims authTokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	if tenantID := strings.TrimSpace(claims.TenantID); tenantID != "" {
		return tenantID
	}

	for _, tenantID := range claims.TenantIDs {
		if trimmedTenantID := strings.TrimSpace(tenantID); trimmedTenantID != "" {
			return trimmedTenantID
		}
	}

	return ""
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
	c.applyAuth(req)

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
	c.applyAuth(req)

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
