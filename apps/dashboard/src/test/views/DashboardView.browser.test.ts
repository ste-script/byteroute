import { page } from 'vitest/browser'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  mountDashboardViewForBrowser,
  resetDashboardBrowserHarness,
  waitForLayout,
} from './dashboardBrowserHarness'

describe('DashboardView mobile layout', () => {
  beforeEach(() => {
    resetDashboardBrowserHarness()
  })

  it('keeps the live connections panel reachable on a mobile viewport', async () => {
    await page.viewport(390, 844)

    const { layoutScroller, connectionsSection, scroller } = await mountDashboardViewForBrowser()

    const initialScrollTop = layoutScroller.scrollTop
    const sectionRectBeforeScroll = connectionsSection.getBoundingClientRect()
    expect(scroller.clientHeight).toBeGreaterThan(0)

    connectionsSection.scrollIntoView({ block: 'start' })
    await waitForLayout()

    const sectionRect = connectionsSection.getBoundingClientRect()
    expect(layoutScroller.scrollTop).toBeGreaterThanOrEqual(initialScrollTop)
    expect(sectionRect.top).toBeGreaterThanOrEqual(0)
    expect(sectionRect.top).toBeLessThan(window.innerHeight)
    expect(sectionRect.top).toBeLessThanOrEqual(sectionRectBeforeScroll.top)

    await expect.element(page.getByRole('heading', { name: 'Live Connections' })).toBeVisible()
    await expect.element(page.getByRole('button', { name: /connection from 192\.168\.1\.1 to 10\.0\.0\.1/i })).toBeVisible()
  })
})