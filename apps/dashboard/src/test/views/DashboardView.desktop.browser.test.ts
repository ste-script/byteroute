import { page } from 'vitest/browser'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  mountDashboardViewForBrowser,
  resetDashboardBrowserHarness,
} from './dashboardBrowserHarness'

describe('DashboardView desktop browsers', () => {
  beforeEach(() => {
    resetDashboardBrowserHarness()
  })

  it('shows the live connections panel without requiring page scroll', async () => {
    await page.viewport(1280, 900)

    const { layoutScroller, connectionsSection, scroller } = await mountDashboardViewForBrowser()

    const heading = page.getByRole('heading', { name: 'Live Connections' })
    const firstConnection = page.getByRole('button', { name: /connection from 192\.168\.1\.1 to 10\.0\.0\.1/i })

    await expect.element(heading).toBeVisible()
    await expect.element(firstConnection).toBeVisible()

    const sectionRect = connectionsSection.getBoundingClientRect()

    expect(layoutScroller.scrollTop).toBe(0)
    expect(scroller.clientHeight).toBeGreaterThan(0)
    expect(sectionRect.top).toBeGreaterThanOrEqual(0)
  })
})