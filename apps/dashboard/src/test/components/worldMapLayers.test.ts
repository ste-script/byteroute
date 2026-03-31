/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest'
import type { TrafficFlow } from '@/types'
import { buildRenderableFlows } from '@/components/worldMapLayers'

describe('worldMapLayers', () => {
  it('creates renderable arc payload with [lng, lat] coordinates', () => {
    const flows: TrafficFlow[] = [
      {
        id: 'flow-1',
        source: { lat: 40.7128, lng: -74.006 },
        target: { lat: 51.5074, lng: -0.1278 },
        value: 25000,
        color: [12, 34, 56, 200],
      },
    ]

    const [renderable] = buildRenderableFlows(flows)

    expect(renderable).toBeDefined()
    expect(renderable?.arcSourcePosition).toEqual([-74.006, 40.7128])
    expect(renderable?.arcTargetPosition).toEqual([-0.1278, 51.5074])
    expect(renderable?.sourcePosition).toEqual([-74.006, 40.7128])
    expect(renderable?.targetPosition).toEqual([-0.1278, 51.5074])
    expect(renderable?.arcWidth).toBe(2.5)
    expect(renderable?.pointRadius).toBe(20)
    expect(renderable?.sourceColor).toEqual([12, 34, 56, 200])
    expect(renderable?.targetColor).toEqual([12, 34, 56, 200])
  })

  it('filters out flows with invalid coordinates', () => {
    const flows: TrafficFlow[] = [
      {
        id: 'valid',
        source: { lat: 48.8566, lng: 2.3522 },
        target: { lat: 41.9028, lng: 12.4964 },
        value: 1000,
      },
      {
        id: 'invalid-lat',
        source: { lat: 95, lng: 10 },
        target: { lat: 41.9028, lng: 12.4964 },
        value: 1000,
      },
      {
        id: 'invalid-lng',
        source: { lat: 10, lng: 10 },
        target: { lat: 41.9028, lng: 200 },
        value: 1000,
      },
      {
        id: 'nan',
        source: { lat: Number.NaN, lng: 10 },
        target: { lat: 41.9028, lng: 12.4964 },
        value: 1000,
      },
    ]

    const renderable = buildRenderableFlows(flows)

    expect(renderable).toHaveLength(1)
    expect(renderable[0]?.id).toBe('valid')
  })

  it('keeps point coordinates while offsetting degenerate arc endpoints', () => {
    const flows: TrafficFlow[] = [
      {
        id: 'same-point-flow',
        source: { lat: 10, lng: 15 },
        target: { lat: 10, lng: 15 },
        value: 500,
      },
    ]

    const [renderable] = buildRenderableFlows(flows)

    expect(renderable?.sourcePosition).toEqual([15, 10])
    expect(renderable?.targetPosition).toEqual([15, 10])
    expect(renderable?.arcSourcePosition).toEqual([15, 10])
    expect(renderable?.arcTargetPosition).not.toEqual([15, 10])
  })
})
