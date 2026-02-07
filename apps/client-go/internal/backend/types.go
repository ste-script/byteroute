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

	Category *string `json:"category,omitempty"`

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
	Blocked      int    `json:"blocked"`
	Inactive     int    `json:"inactive"`
}

type MetricsPayload struct {
	Snapshots []MetricsSnapshot `json:"snapshots"`
}

type AcceptedResponse struct {
	Received int    `json:"received"`
	Status   string `json:"status"`
}
