import { describe, it, expect } from 'vitest'
import { normalizeIp, firstForwardedFor, isPrivateIp, isPrivateIpv4 } from '../../src/utils/ip.js'

describe('IP Utils', () => {
  describe('normalizeIp', () => {
    it('should return undefined for null or undefined', () => {
      expect(normalizeIp(null)).toBeUndefined()
      expect(normalizeIp(undefined)).toBeUndefined()
    })

    it('should return undefined for empty or whitespace-only strings', () => {
      expect(normalizeIp('')).toBeUndefined()
      expect(normalizeIp('  ')).toBeUndefined()
      expect(normalizeIp('\t\n')).toBeUndefined()
    })

    it('should normalize valid IPv4 addresses', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1')
      expect(normalizeIp('  192.168.1.1  ')).toBe('192.168.1.1')
      expect(normalizeIp('8.8.8.8')).toBe('8.8.8.8')
    })

    it('should normalize valid IPv6 addresses', () => {
      expect(normalizeIp('::1')).toBe('::1')
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1')
      expect(normalizeIp('fe80::1')).toBe('fe80::1')
    })

    it('should strip port from IPv4 addresses', () => {
      expect(normalizeIp('192.168.1.1:8080')).toBe('192.168.1.1')
      expect(normalizeIp('8.8.8.8:443')).toBe('8.8.8.8')
    })

    it('should handle bracketed IPv6 addresses with ports', () => {
      expect(normalizeIp('[::1]:8080')).toBe('::1')
      expect(normalizeIp('[2001:db8::1]:443')).toBe('2001:db8::1')
    })

    it('should convert IPv4-mapped IPv6 to IPv4', () => {
      expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1')
      expect(normalizeIp('::ffff:8.8.8.8')).toBe('8.8.8.8')
    })

    it('should return undefined for invalid IP addresses', () => {
      expect(normalizeIp('not-an-ip')).toBeUndefined()
      expect(normalizeIp('999.999.999.999')).toBeUndefined()
      expect(normalizeIp('invalid::address::')).toBeUndefined()
    })

    it('should handle edge cases', () => {
      // IPv6 without brackets but with colon (valid IPv6)
      expect(normalizeIp('::1')).toBe('::1')

      // Single value (not an IP)
      expect(normalizeIp('localhost')).toBeUndefined()
    })
  })

  describe('firstForwardedFor', () => {
    it('should return undefined for non-string values', () => {
      expect(firstForwardedFor(undefined)).toBeUndefined()
      expect(firstForwardedFor(null)).toBeUndefined()
      expect(firstForwardedFor(123)).toBeUndefined()
      expect(firstForwardedFor({})).toBeUndefined()
      expect(firstForwardedFor([])).toBeUndefined()
    })

    it('should extract first IP from comma-separated list', () => {
      expect(firstForwardedFor('192.168.1.1, 10.0.0.1')).toBe('192.168.1.1')
      expect(firstForwardedFor('8.8.8.8, 1.1.1.1, 9.9.9.9')).toBe('8.8.8.8')
    })

    it('should handle single IP', () => {
      expect(firstForwardedFor('192.168.1.1')).toBe('192.168.1.1')
      expect(firstForwardedFor('::1')).toBe('::1')
    })

    it('should trim whitespace', () => {
      expect(firstForwardedFor('  192.168.1.1  ')).toBe('192.168.1.1')
      expect(firstForwardedFor('  192.168.1.1  , 10.0.0.1')).toBe('192.168.1.1')
    })

    it('should normalize the extracted IP', () => {
      expect(firstForwardedFor('192.168.1.1:8080, 10.0.0.1')).toBe('192.168.1.1')
      expect(firstForwardedFor('::ffff:192.168.1.1, 10.0.0.1')).toBe('192.168.1.1')
    })

    it('should return undefined for invalid IPs', () => {
      expect(firstForwardedFor('not-an-ip')).toBeUndefined()
      expect(firstForwardedFor('invalid, 192.168.1.1')).toBeUndefined()
    })
  })

  describe('isPrivateIpv4', () => {
    it('should identify private IPv4 addresses', () => {
      expect(isPrivateIpv4('192.168.1.1')).toBe(true)
      expect(isPrivateIpv4('10.0.0.1')).toBe(true)
      expect(isPrivateIpv4('172.16.0.1')).toBe(true)
      expect(isPrivateIpv4('127.0.0.1')).toBe(true)
    })

    it('should identify public IPv4 addresses', () => {
      expect(isPrivateIpv4('8.8.8.8')).toBe(false)
      expect(isPrivateIpv4('1.1.1.1')).toBe(false)
      expect(isPrivateIpv4('208.67.222.222')).toBe(false)
    })
  })

  describe('isPrivateIp', () => {
    it('should identify private IPv4 addresses', () => {
      expect(isPrivateIp('192.168.1.1')).toBe(true)
      expect(isPrivateIp('10.0.0.1')).toBe(true)
      expect(isPrivateIp('172.16.0.1')).toBe(true)
    })

    it('should identify public IPv4 addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false)
      expect(isPrivateIp('1.1.1.1')).toBe(false)
    })

    it('should return false for IPv6 addresses (not implemented)', () => {
      expect(isPrivateIp('::1')).toBe(false)
      expect(isPrivateIp('fe80::1')).toBe(false)
      expect(isPrivateIp('2001:db8::1')).toBe(false)
    })
  })
})
