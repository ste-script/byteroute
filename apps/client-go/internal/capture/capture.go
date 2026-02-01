package capture

import (
	"fmt"
	"net"
	"time"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)

type PacketEvent struct {
	Timestamp time.Time
	SrcIP     net.IP
	DstIP     net.IP
	SrcPort   uint16
	DstPort   uint16
	Protocol  string
	Length    int
}

func ListIfaces() ([]net.Interface, error) {
	return net.Interfaces()
}

func LocalIPsForInterface(name string) (map[string]struct{}, error) {
	iface, err := net.InterfaceByName(name)
	if err != nil {
		return nil, err
	}
	addrs, err := iface.Addrs()
	if err != nil {
		return nil, err
	}
	set := map[string]struct{}{}
	for _, a := range addrs {
		var ip net.IP
		switch v := a.(type) {
		case *net.IPNet:
			ip = v.IP
		case *net.IPAddr:
			ip = v.IP
		}
		if ip == nil {
			continue
		}
		set[ip.String()] = struct{}{}
	}
	return set, nil
}

func Start(iface, bpf string, snapLen int, promisc bool) (*pcap.Handle, <-chan PacketEvent, error) {
	handle, err := pcap.OpenLive(iface, int32(snapLen), promisc, pcap.BlockForever)
	if err != nil {
		return nil, nil, err
	}

	if bpf != "" {
		if err := handle.SetBPFFilter(bpf); err != nil {
			handle.Close()
			return nil, nil, fmt.Errorf("set BPF: %w", err)
		}
	}

	out := make(chan PacketEvent, 2048)
	src := gopacket.NewPacketSource(handle, handle.LinkType())

	go func() {
		defer close(out)
		for packet := range src.Packets() {
			nl := packet.NetworkLayer()
			if nl == nil {
				continue
			}

			var srcIP, dstIP net.IP
			switch v := nl.(type) {
			case *layers.IPv4:
				srcIP = v.SrcIP
				dstIP = v.DstIP
			case *layers.IPv6:
				srcIP = v.SrcIP
				dstIP = v.DstIP
			default:
				continue
			}

			var srcPort, dstPort uint16
			proto := "OTHER"

			if tl := packet.TransportLayer(); tl != nil {
				switch t := tl.(type) {
				case *layers.TCP:
					proto = "TCP"
					srcPort = uint16(t.SrcPort)
					dstPort = uint16(t.DstPort)
				case *layers.UDP:
					proto = "UDP"
					srcPort = uint16(t.SrcPort)
					dstPort = uint16(t.DstPort)
				}
			}

			if packet.Layer(layers.LayerTypeICMPv4) != nil || packet.Layer(layers.LayerTypeICMPv6) != nil {
				proto = "ICMP"
			}

			out <- PacketEvent{
				Timestamp: packet.Metadata().Timestamp,
				SrcIP:     srcIP,
				DstIP:     dstIP,
				SrcPort:   srcPort,
				DstPort:   dstPort,
				Protocol:  proto,
				Length:    len(packet.Data()),
			}
		}
	}()

	return handle, out, nil
}
