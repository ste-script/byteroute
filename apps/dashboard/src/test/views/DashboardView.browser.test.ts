import { page } from 'vitest/browser'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Component } from 'vue'

import {
  CONNECTION_ROW_ARIA_LABEL_PATTERN,
  mountDashboardViewForBrowser,
  resetDashboardBrowserHarness,
  setDashboardBrowserHarnessTenants,
  waitForLayout,
} from './dashboardBrowserHarness'

describe('DashboardView mobile layout', () => {
  beforeEach(() => {
    resetDashboardBrowserHarness()
  })

  it('keeps the live connections panel reachable on a mobile viewport', async () => {
    await page.viewport(390, 844)

    const { layoutScroller, chartsSection, connectionsSection, scroller } = await mountDashboardViewForBrowser(
      async () => ((await import('../../views/DashboardView.vue')) as { default: Component }).default,
    )
    const documentScroller = document.scrollingElement as HTMLElement
    const scrollElement = layoutScroller.scrollHeight > documentScroller.scrollHeight ? layoutScroller : documentScroller

    const heading = page.getByRole('heading', { name: 'Live Connections' })
    const firstConnection = page.getByRole('button', { name: CONNECTION_ROW_ARIA_LABEL_PATTERN }).first()
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

  it('shows first-run wizard and opens tenant dialog from CTA on mobile', async () => {
    await page.viewport(390, 844)
    setDashboardBrowserHarnessTenants([])

    await mountDashboardViewForBrowser(
      async () => ((await import('../../views/DashboardView.vue')) as { default: Component }).default,
      { expectLivePanels: false },
    )

    const wizardHeading = page.getByRole('heading', { name: 'Set up your first tenant' })
    const createTenantButton = page.getByRole('button', { name: 'Create tenant' })

    await expect.element(wizardHeading).toBeVisible()
    await expect.element(page.getByText('What each section does')).toBeVisible()
    await expect.element(createTenantButton).toBeVisible()

    await createTenantButton.click()
    await waitForLayout()

    const dialogState = document.querySelector('[data-test="new-tenant-dialog"]') as HTMLElement | null
    expect(dialogState?.dataset.visible).toBe('open')
  })

})