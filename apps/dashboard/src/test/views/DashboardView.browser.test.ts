import { page } from 'vitest/browser'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Component } from 'vue'

import {
  mountDashboardViewForBrowser,
  resetDashboardBrowserHarness,
  waitForLayout,
} from './dashboardBrowserHarness'

const dashboardViewModulePath = '../../views/DashboardView.vue'

describe('DashboardView mobile layout', () => {
  beforeEach(() => {
    resetDashboardBrowserHarness()
  })

  it('keeps the live connections panel reachable on a mobile viewport', async () => {
    await page.viewport(390, 844)

    const { layoutScroller, chartsSection, connectionsSection, scroller } = await mountDashboardViewForBrowser(
      async () => ((await import(/* @vite-ignore */ dashboardViewModulePath)) as { default: Component }).default,
    )
    const documentScroller = document.scrollingElement as HTMLElement
    const scrollElement = layoutScroller.scrollHeight > documentScroller.scrollHeight ? layoutScroller : documentScroller

    const heading = page.getByRole('heading', { name: 'Live Connections' })
    const firstConnection = page.getByRole('button', { name: /connection from 192\.168\.1\.1 to 10\.0\.0\.1/i })
    const chartRect = chartsSection.getBoundingClientRect()
    const connectionsRect = connectionsSection.getBoundingClientRect()

    expect(scroller.clientHeight).toBeGreaterThan(0)
    expect(scrollElement.scrollHeight).toBeGreaterThan(scrollElement.clientHeight)
    expect(chartRect.bottom).toBeLessThanOrEqual(connectionsRect.top + 1)

    scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'auto' })
    await waitForLayout()

    const sectionRect = connectionsSection.getBoundingClientRect()
    expect(scrollElement.scrollTop).toBeGreaterThan(0)
    expect(sectionRect.top).toBeGreaterThanOrEqual(0)
    expect(sectionRect.top).toBeLessThan(window.innerHeight)

    await expect.element(heading).toBeVisible()
    await expect.element(firstConnection).toBeVisible()
  })
})