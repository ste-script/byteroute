import { describe, it, expect, afterEach } from 'vitest'
import client, { setAuthToken, apiErrorMessage } from '../../api/client'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

describe('API Client', () => {
  it('sends credentials with requests so cookie auth survives reloads', () => {
    expect(client.defaults.withCredentials).toBe(true)
  })

  afterEach(() => {
    document.cookie = 'byteroute_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    // Reset auth token after each test
    setAuthToken(null)
  })

  describe('setAuthToken', () => {
    it('adds Authorization Bearer header when token is set', async () => {
      setAuthToken('my-jwt-token')

      // Grab the request config via interceptors
      const interceptorId = client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
        return config
      })

      // Trigger the interceptors by creating and running an axios config
      // without actually making a network call
      const config = { headers: {} as Record<string, string> }
      const interceptors = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>
      }).handlers

      let processedConfig = config
      for (const handler of interceptors) {
        if (handler?.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig) as typeof config
        }
      }

      expect(processedConfig.headers['Authorization']).toBe('Bearer my-jwt-token')

      client.interceptors.request.eject(interceptorId)
    })

    it('does not add Authorization header when token is null', () => {
      setAuthToken(null)

      const config = { headers: {} as Record<string, string> }
      const interceptors = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>
      }).handlers

      let processedConfig = config
      for (const handler of interceptors) {
        if (handler?.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig) as typeof config
        }
      }

      expect(processedConfig.headers['Authorization']).toBeUndefined()
    })

    it('clears the Authorization header when called with null after being set', () => {
      setAuthToken('some-token')
      setAuthToken(null)

      const config = { headers: {} as Record<string, string> }
      const interceptors = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>
      }).handlers

      let processedConfig = config
      for (const handler of interceptors) {
        if (handler?.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig) as typeof config
        }
      }

      expect(processedConfig.headers['Authorization']).toBeUndefined()
    })

    it('adds X-CSRF-Token header for unsafe requests when csrf cookie is present', () => {
      document.cookie = 'byteroute_csrf=csrf-cookie-value'

      const config = {
        method: 'post',
        headers: {} as Record<string, string>
      }
      const interceptors = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>
      }).handlers

      let processedConfig = config
      for (const handler of interceptors) {
        if (handler?.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig) as typeof config
        }
      }

      expect(processedConfig.headers['X-CSRF-Token']).toBe('csrf-cookie-value')
    })

    it('does not add X-CSRF-Token header for safe requests', () => {
      document.cookie = 'byteroute_csrf=csrf-cookie-value'

      const config = {
        method: 'get',
        headers: {} as Record<string, string>
      }
      const interceptors = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>
      }).handlers

      let processedConfig = config
      for (const handler of interceptors) {
        if (handler?.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig) as typeof config
        }
      }

      expect(processedConfig.headers['X-CSRF-Token']).toBeUndefined()
    })
  })

  describe('apiErrorMessage', () => {
    it('returns response.data.error when available', () => {
      const error = {
        response: { data: { error: 'Invalid credentials' } },
        message: 'Request failed'
      } as AxiosError<{ error?: string }>

      expect(apiErrorMessage(error, 'fallback')).toBe('Invalid credentials')
    })

    it('returns error.message when no response.data.error', () => {
      const error = new Error('Something went wrong')
      expect(apiErrorMessage(error, 'fallback')).toBe('Something went wrong')
    })

    it('returns fallback for non-Error, non-axios errors', () => {
      expect(apiErrorMessage('string error', 'fallback message')).toBe('fallback message')
      expect(apiErrorMessage(42, 'default')).toBe('default')
    })

    it('returns fallback when axios error has empty response', () => {
      const error = { response: { data: {} }, message: 'oops' } as AxiosError<{ error?: string }>
      // response.data.error is undefined → falls back to error.message check
      // But it's not instanceof Error either → fallback
      expect(apiErrorMessage(error, 'fallback')).toBe('fallback')
    })
  })
})
