/**
 * Format a byte count as a human-readable bandwidth string (e.g. "1.2 MB/s").
 * @param bytes - bytes per second
 */
export function formatBandwidth(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB/s'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB/s'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB/s'
  return bytes + ' B/s'
}

/**
 * Format a byte count as a human-readable size string (no "/s" suffix).
 * Used for cumulative totals like statistics bandwidth.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

/**
 * Format a number with K/M suffix for compact display.
 */
export function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toString()
}

/**
 * Format a start timestamp as a human-readable elapsed duration (e.g. "2h 15m").
 */
export function formatDuration(startTime: Date | string): string {
  const start = new Date(startTime)
  const diff = Date.now() - start.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Calculate bytes-per-second bandwidth from a connection's cumulative byte counters.
 */
export function calculateBandwidth(params: {
  bytesIn?: number
  bytesOut?: number
  duration?: number
}): number {
  const bytesIn = params.bytesIn ?? 0
  const bytesOut = params.bytesOut ?? 0
  const durationMs = params.duration ?? 0
  if (durationMs === 0) return 0
  return Math.round((bytesIn + bytesOut) / (durationMs / 1000))
}
