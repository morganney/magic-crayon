import { ELLIPSE_SEGMENTS } from './constants.js'
import type { NormalizedPoint, NormalizedRect } from './types.js'

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}

const isNormalizedValue = (value: unknown): value is number => {
  return isFiniteNumber(value) && value >= 0 && value <= 100
}

const isNormalizedPoint = (point: unknown): point is NormalizedPoint => {
  if (!point || typeof point !== 'object') {
    return false
  }

  const candidate = point as Record<string, unknown>

  return isNormalizedValue(candidate.x) && isNormalizedValue(candidate.y)
}

const isNormalizedRect = (rect: unknown): rect is NormalizedRect => {
  if (!rect || typeof rect !== 'object') {
    return false
  }

  const candidate = rect as Record<string, unknown>

  if (
    !isNormalizedValue(candidate.x) ||
    !isNormalizedValue(candidate.y) ||
    !isNormalizedValue(candidate.width) ||
    !isNormalizedValue(candidate.height)
  ) {
    return false
  }

  return candidate.x + candidate.width <= 100 && candidate.y + candidate.height <= 100
}

const toRectOutlinePoints = (rect: NormalizedRect): NormalizedPoint[] => {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  return [
    { x: rect.x, y: rect.y },
    { x: right, y: rect.y },
    { x: right, y: bottom },
    { x: rect.x, y: bottom },
    { x: rect.x, y: rect.y },
  ]
}

const toBezierPoints = (
  start: NormalizedPoint,
  control1: NormalizedPoint,
  control2: NormalizedPoint,
  end: NormalizedPoint,
  segments: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const inv = 1 - t
    const x =
      inv * inv * inv * start.x +
      3 * inv * inv * t * control1.x +
      3 * inv * t * t * control2.x +
      t * t * t * end.x
    const y =
      inv * inv * inv * start.y +
      3 * inv * inv * t * control1.y +
      3 * inv * t * t * control2.y +
      t * t * t * end.y

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

const toEllipsePoints = (
  center: NormalizedPoint,
  radiusX: number,
  radiusY: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []

  for (let index = 0; index <= ELLIPSE_SEGMENTS; index += 1) {
    const theta = (index / ELLIPSE_SEGMENTS) * Math.PI * 2
    const x = center.x + Math.cos(theta) * radiusX
    const y = center.y + Math.sin(theta) * radiusY

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

const toPolygonPoints = (
  points: NormalizedPoint[],
  closed: boolean,
): NormalizedPoint[] => {
  const normalizedPoints = points.map(point => ({
    x: point.x,
    y: point.y,
  }))

  if (closed) {
    normalizedPoints.push({
      x: points[0].x,
      y: points[0].y,
    })
  }

  return normalizedPoints
}

const toArcPoints = (
  center: NormalizedPoint,
  radius: number,
  startAngleDegrees: number,
  endAngleDegrees: number,
  counterclockwise: boolean,
  segments: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []
  let delta = endAngleDegrees - startAngleDegrees

  if (!counterclockwise && delta < 0) {
    delta += 360
  }

  if (counterclockwise && delta > 0) {
    delta -= 360
  }

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const angleDegrees = startAngleDegrees + delta * t
    const theta = (angleDegrees * Math.PI) / 180
    const x = center.x + Math.cos(theta) * radius
    const y = center.y + Math.sin(theta) * radius

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

export {
  isFiniteNumber,
  isNormalizedPoint,
  isNormalizedRect,
  isNormalizedValue,
  toArcPoints,
  toBezierPoints,
  toEllipsePoints,
  toPolygonPoints,
  toRectOutlinePoints,
}
