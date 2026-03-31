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

import type { TrafficFlow } from '@/types'

const DEFAULT_SOURCE_COLOR: [number, number, number, number] = [0, 128, 255, 200]
const DEFAULT_TARGET_COLOR: [number, number, number, number] = [255, 100, 100, 200]

interface Coordinate {
  lat: number
  lng: number
}

export interface RenderableFlow {
  id: string
  arcSourcePosition: [number, number]
  arcTargetPosition: [number, number]
  sourcePosition: [number, number]
  targetPosition: [number, number]
  sourceColor: [number, number, number, number]
  targetColor: [number, number, number, number]
  arcWidth: number
  pointRadius: number
  flow: TrafficFlow
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value)
}

function isValidCoordinate(point: Coordinate): boolean {
  return isFiniteNumber(point.lat)
    && isFiniteNumber(point.lng)
    && point.lat >= -90
    && point.lat <= 90
    && point.lng >= -180
    && point.lng <= 180
}

function getArcWidth(value: number): number {
  return Math.max(1, Math.min(value / 10000, 8))
}

function getPointRadius(value: number): number {
  return Math.max(4, Math.min(value / 50, 20))
}

function clampLatitude(value: number): number {
  return Math.max(-89.5, Math.min(89.5, value))
}

function clampLongitude(value: number): number {
  if (value > 180) return value - 360
  if (value < -180) return value + 360
  return value
}

function coordinatesMatch(source: Coordinate, target: Coordinate): boolean {
  const epsilon = 1e-6
  return Math.abs(source.lat - target.lat) < epsilon && Math.abs(source.lng - target.lng) < epsilon
}

function hashSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getArcTargetCoordinate(source: Coordinate, target: Coordinate, flowId: string): Coordinate {
  if (!coordinatesMatch(source, target)) {
    return target
  }

  // Avoid zero-length arcs by slightly offsetting the arc end point while preserving dot positions.
  const seed = hashSeed(flowId)
  const latOffset = ((seed % 11) - 5) * 0.08
  const lngOffset = (((seed >> 4) % 13) - 6) * 0.12

  return {
    lat: clampLatitude(target.lat + latOffset),
    lng: clampLongitude(target.lng + lngOffset),
  }
}

export function buildRenderableFlows(flows: TrafficFlow[]): RenderableFlow[] {
  return flows
    .filter((flow) => isValidCoordinate(flow.source) && isValidCoordinate(flow.target))
    .map((flow) => {
      const arcTarget = getArcTargetCoordinate(flow.source, flow.target, flow.id)

      return {
        id: flow.id,
        arcSourcePosition: [flow.source.lng, flow.source.lat],
        arcTargetPosition: [arcTarget.lng, arcTarget.lat],
        sourcePosition: [flow.source.lng, flow.source.lat],
        targetPosition: [flow.target.lng, flow.target.lat],
        sourceColor: flow.color ?? DEFAULT_SOURCE_COLOR,
        targetColor: flow.color ?? DEFAULT_TARGET_COLOR,
        arcWidth: getArcWidth(flow.value),
        pointRadius: getPointRadius(flow.value),
        flow,
      }
    })
}
