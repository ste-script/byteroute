package util

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
)

func StableID(hostID string, parts ...any) string {
	h := sha1.New()
	if hostID != "" {
		_, _ = h.Write([]byte(hostID))
		_, _ = h.Write([]byte("|"))
	}
	for i, p := range parts {
		if i > 0 {
			_, _ = h.Write([]byte("|"))
		}
		_, _ = h.Write([]byte(fmt.Sprint(p)))
	}
	sum := h.Sum(nil)
	return hex.EncodeToString(sum)
}
