import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatBandwidth,
  formatBytes,
  formatNumber,
  formatDuration,
  calculateBandwidth
} from '@/utils/formatters'

describe('formatBandwidth', () => {
  it('returns GB/s for values >= 1e9', () => {
    expect(formatBandwidth(1_500_000_000)).toBe('1.5 GB/s')
    expect(formatBandwidth(1_000_000_000)).toBe('1.0 GB/s')
  })

  it('returns MB/s for values >= 1e6 and < 1e9', () => {
    expect(formatBandwidth(2_500_000)).toBe('2.5 MB/s')
    expect(formatBandwidth(1_000_000)).toBe('1.0 MB/s')
  })

  it('returns KB/s for values >= 1e3 and < 1e6', () => {
    expect(formatBandwidth(1_500)).toBe('1.5 KB/s')
    expect(formatBandwidth(1_000)).toBe('1.0 KB/s')
  })

  it('returns B/s for values < 1e3', () => {
    expect(formatBandwidth(999)).toBe('999 B/s')
    expect(formatBandwidth(0)).toBe('0 B/s')
  })
})

describe('formatBytes', () => {
  it('returns GB for values >= 1e9', () => {
    expect(formatBytes(1_500_000_000)).toBe('1.5 GB')
    expect(formatBytes(1_000_000_000)).toBe('1.0 GB')
  })

  it('returns MB for values >= 1e6 and < 1e9', () => {
    expect(formatBytes(2_500_000)).toBe('2.5 MB')
    expect(formatBytes(1_000_000)).toBe('1.0 MB')
  })

  it('returns KB for values >= 1e3 and < 1e6', () => {
    expect(formatBytes(1_500)).toBe('1.5 KB')
    expect(formatBytes(1_000)).toBe('1.0 KB')
  })

  it('returns B for values < 1e3', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(0)).toBe('0 B')
  })
})

describe('formatNumber', () => {
  it('returns M suffix for values >= 1e6', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M')
    expect(formatNumber(1_000_000)).toBe('1.0M')
  })

  it('returns K suffix for values >= 1e3 and < 1e6', () => {
    expect(formatNumber(1_500)).toBe('1.5K')
    expect(formatNumber(1_000)).toBe('1.0K')
  })

  it('returns plain number for values < 1e3', () => {
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
  })
})

describe('formatDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns days and hours when duration >= 1 day', () => {
    const start = new Date('2025-12-30T12:00:00Z') // 2 days ago
    expect(formatDuration(start)).toBe('2d 0h')
  })

  it('shows remaining hours correctly within days', () => {
    const start = new Date('2025-12-30T06:00:00Z') // 2d 6h ago
    expect(formatDuration(start)).toBe('2d 6h')
  })

  it('returns hours and minutes when duration >= 1 hour', () => {
    const start = new Date('2026-01-01T09:30:00Z') // 2h 30m ago
    expect(formatDuration(start)).toBe('2h 30m')
  })

  it('returns minutes and seconds when duration >= 1 minute', () => {
    const start = new Date('2026-01-01T11:58:45Z') // 1m 15s ago
    expect(formatDuration(start)).toBe('1m 15s')
  })

  it('returns seconds only when duration < 1 minute', () => {
    const start = new Date('2026-01-01T11:59:45Z') // 15s ago
    expect(formatDuration(start)).toBe('15s')
  })

  it('accepts a string timestamp', () => {
    const result = formatDuration('2026-01-01T11:59:00Z') // 60s ago
    expect(result).toBe('1m 0s')
  })
})

describe('calculateBandwidth', () => {
  it('returns 0 when duration is 0', () => {
    expect(calculateBandwidth({ bytesIn: 1000, bytesOut: 1000, duration: 0 })).toBe(0)
  })

  it('calculates bytes per second correctly', () => {
    // 6000 bytes over 3000ms = 2000 B/s
    expect(calculateBandwidth({ bytesIn: 3000, bytesOut: 3000, duration: 3000 })).toBe(2000)
  })

  it('defaults missing bytesIn/bytesOut to 0', () => {
    expect(calculateBandwidth({ duration: 1000 })).toBe(0)
    expect(calculateBandwidth({ bytesIn: 2000, duration: 1000 })).toBe(2000)
    expect(calculateBandwidth({ bytesOut: 2000, duration: 1000 })).toBe(2000)
  })

  it('defaults missing duration to 0, returning 0', () => {
    expect(calculateBandwidth({ bytesIn: 9999, bytesOut: 9999 })).toBe(0)
  })

  it('rounds to nearest integer', () => {
    // 1001 bytes over 1000ms = 1.001 → rounds to 1
    expect(calculateBandwidth({ bytesIn: 1000, bytesOut: 1, duration: 1000 })).toBe(1001)
  })
})
