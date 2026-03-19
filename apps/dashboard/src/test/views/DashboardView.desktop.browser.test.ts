import { page } from 'vitest/browser'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Component } from 'vue'

import {
  mountDashboardViewForBrowser,
  resetDashboardBrowserHarness,
  waitForLayout,
} from './dashboardBrowserHarness'

describe('DashboardView desktop browsers', () => {
  beforeEach(() => {
    resetDashboardBrowserHarness()
  })

  it('shows the live connections panel without requiring page scroll', async () => {
    await page.viewport(1280, 900)

    const { layoutScroller, connectionsSection, scroller } = await mountDashboardViewForBrowser(
      async () => ((await import('../../views/DashboardView.vue')) as { default: Component }).default,
    )

    const heading = page.getByRole('heading', { name: 'Live Connections' })
    const firstConnection = page.getByRole('button', { name: /connection from 192\.168\.1\.1 to 10\.0\.0\.1/i })

    await expect.element(heading).toBeVisible()
    await expect.element(firstConnection).toBeVisible()

    const sectionRect = connectionsSection.getBoundingClientRect()

    expect(layoutScroller.scrollTop).toBe(0)
    expect(scroller.clientHeight).toBeGreaterThan(0)
    expect(sectionRect.top).toBeGreaterThanOrEqual(0)
  })

  it('keeps live connections reachable via page scroll on compact desktop heights', async () => {
    await page.viewport(1000, 800)

    const { layoutScroller, connectionsSection } = await mountDashboardViewForBrowser(
      async () => ((await import('../../views/DashboardView.vue')) as { default: Component }).default,
    )
    const dashboardGrid = document.querySelector('.dashboard-grid') as HTMLElement | null
    const documentScroller = document.scrollingElement as HTMLElement
    const scrollCandidates = [dashboardGrid, layoutScroller, documentScroller].filter(
      (element): element is HTMLElement => Boolean(element),
    )
    const scrollElement = scrollCandidates.find(
      (element) => element.scrollHeight > element.clientHeight,
    ) ?? layoutScroller

    const heading = page.getByRole('heading', { name: 'Live Connections' })

    expect(scrollElement.scrollHeight).toBeGreaterThan(scrollElement.clientHeight)

    let reachedConnections = false

    for (const candidate of scrollCandidates) {
      candidate.scrollTo({ top: candidate.scrollHeight, behavior: 'auto' })
      await waitForLayout()

      const sectionRect = connectionsSection.getBoundingClientRect()
      if (sectionRect.top < window.innerHeight && sectionRect.bottom > 0) {
        reachedConnections = true
        break
      }
    }

    expect(reachedConnections).toBe(true)

    await expect.element(heading).toBeVisible()
  })

  it('applies dark-mode-aware styling to dashboard section titles', async () => {
    await page.viewport(1280, 900)
    window.localStorage.setItem('byteroute:dark-mode', 'true')
    document.documentElement.style.setProperty('--p-text-color', 'rgb(230, 232, 240)')
    document.documentElement.style.setProperty('--p-surface-50', 'rgb(245, 245, 245)')
    document.documentElement.style.setProperty('--p-surface-card', 'rgb(25, 28, 34)')

    await mountDashboardViewForBrowser(
      async () => ((await import('../../views/DashboardView.vue')) as { default: Component }).default,
    )

    const expectedTextColor = 'rgb(230, 232, 240)'
    const expectedHeaderBackground = 'rgb(25, 28, 34)'
    const titleIds = ['world-traffic-title', 'timeline-title', 'statistics-title', 'connections-title']

    for (const id of titleIds) {
      const title = document.getElementById(id)
      expect(title).not.toBeNull()
      expect(title?.classList.contains('dashboard-section-title')).toBe(true)
      expect(window.getComputedStyle(title as HTMLElement).color).toBe(expectedTextColor)

      const header = title?.closest('.dashboard-section-header') as HTMLElement | null
      expect(header).not.toBeNull()
      expect(window.getComputedStyle(header as HTMLElement).backgroundColor).toBe(expectedHeaderBackground)
    }
  })
})
