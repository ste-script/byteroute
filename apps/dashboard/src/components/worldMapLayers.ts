import type { TrafficFlow } from '@/types'

const DEFAULT_SOURCE_COLOR: [number, number, number, number] = [0, 128, 255, 200]
const DEFAULT_TARGET_COLOR: [number, number, number, number] = [255, 100, 100, 200]

interface Coordinate {
  lat: number
  lng: number
}

export interface RenderableFlow {
  id: string
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

export function buildRenderableFlows(flows: TrafficFlow[]): RenderableFlow[] {
  return flows
    .filter((flow) => isValidCoordinate(flow.source) && isValidCoordinate(flow.target))
    .map((flow) => ({
      id: flow.id,
      sourcePosition: [flow.source.lng, flow.source.lat],
      targetPosition: [flow.target.lng, flow.target.lat],
      sourceColor: flow.color ?? DEFAULT_SOURCE_COLOR,
      targetColor: flow.color ?? DEFAULT_TARGET_COLOR,
      arcWidth: getArcWidth(flow.value),
      pointRadius: getPointRadius(flow.value),
      flow,
    }))
}
