package capture

import (
	"net"
	"sort"
	"strings"
)

// BuildDefaultBPF builds a conservative BPF expression.
// - baseExpr: usually "tcp or udp or icmp"
// - direction: "out", "in", or "both"
// - localIPs: interface IPs; only IPv4 is used for BPF (more portable)
func BuildDefaultBPF(baseExpr, direction string, localIPs map[string]struct{}) string {
	baseExpr = strings.TrimSpace(baseExpr)
	if baseExpr == "" {
		baseExpr = "tcp or udp or icmp"
	}

	direction = strings.ToLower(strings.TrimSpace(direction))
	if direction == "" {
		direction = "out"
	}
	if direction == "both" {
		return "(" + baseExpr + ") and not " + bothPrivateIPv4Clause()
	}

	ipv4s := make([]string, 0, len(localIPs))
	for s := range localIPs {
		ip := net.ParseIP(s)
		if ip == nil {
			continue
		}
		ip4 := ip.To4()
		if ip4 == nil {
			continue
		}
		ipv4s = append(ipv4s, ip4.String())
	}
	sort.Strings(ipv4s)

	if len(ipv4s) == 0 {
		// No usable local IPv4s; fall back to protocol-only capture.
		return "(" + baseExpr + ") and not " + bothPrivateIPv4Clause()
	}

	parts := make([]string, 0, len(ipv4s))
	prefix := "src host "
	if direction == "in" {
		prefix = "dst host "
	}
	for _, ip := range ipv4s {
		parts = append(parts, prefix+ip)
	}

	localClause := "(" + strings.Join(parts, " or ") + ")"
	return "(" + baseExpr + ") and " + localClause + " and not " + bothPrivateIPv4Clause()
}

func bothPrivateIPv4Clause() string {
	// Exclude packets where BOTH endpoints are private RFC1918 IPv4.
	// (10.0.0.0/8) OR (172.16.0.0/12) OR (192.168.0.0/16)
	srcPrivate := "(src net 10.0.0.0/8 or src net 172.16.0.0/12 or src net 192.168.0.0/16)"
	dstPrivate := "(dst net 10.0.0.0/8 or dst net 172.16.0.0/12 or dst net 192.168.0.0/16)"
	return "(" + srcPrivate + " and " + dstPrivate + ")"
}
 