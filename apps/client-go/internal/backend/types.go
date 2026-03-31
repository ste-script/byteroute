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

// Connection matches the backend's expected JSON shape.
// Keep this minimal + stable; backend accepts Partial<Connection>.
type Connection struct {
	ID         string `json:"id"`
	SourceIP   string `json:"sourceIp"`
	DestIP     string `json:"destIp"`
	SourcePort int    `json:"sourcePort"`
	DestPort   int    `json:"destPort"`
	Protocol   string `json:"protocol"`
	Status     string `json:"status"`

	Country     *string  `json:"country,omitempty"`
	CountryCode *string  `json:"countryCode,omitempty"`
	City        *string  `json:"city,omitempty"`
	Latitude    *float64 `json:"latitude,omitempty"`
	Longitude   *float64 `json:"longitude,omitempty"`
	ASN         *int     `json:"asn,omitempty"`
	ASOrg       *string  `json:"asOrganization,omitempty"`
	Enriched    *bool    `json:"enriched,omitempty"`

	Bandwidth  *int64 `json:"bandwidth,omitempty"`
	BytesIn    *int64 `json:"bytesIn,omitempty"`
	BytesOut   *int64 `json:"bytesOut,omitempty"`
	PacketsIn  *int64 `json:"packetsIn,omitempty"`
	PacketsOut *int64 `json:"packetsOut,omitempty"`

	StartTime    string `json:"startTime"`
	LastActivity string `json:"lastActivity"`
	DurationMs   *int64 `json:"duration,omitempty"`
}

type ConnectionsPayload struct {
	Connections []Connection `json:"connections"`
}

// MetricsSnapshot represents aggregated interface metrics for a time period
type MetricsSnapshot struct {
	Timestamp    string `json:"timestamp"`
	Connections  int    `json:"connections"`
	BandwidthIn  int64  `json:"bandwidthIn"`
	BandwidthOut int64  `json:"bandwidthOut"`
	Inactive     int    `json:"inactive"`
}

type MetricsPayload struct {
	Snapshots []MetricsSnapshot `json:"snapshots"`
}

type AcceptedResponse struct {
	Received int    `json:"received"`
	Status   string `json:"status"`
}
