import { Composites } from '../context2d.js'
import type { StrokeCommand } from '../context2d-document.js'
import {
  MAX_FILL_STROKES,
  MIN_FILL_SCANLINE_WIDTH,
  SOURCE_SPACE_SIZE,
} from './constants.js'
import type { NormalizedPoint, NormalizedRect } from './types.js'

const toFillRectStrokeCommands = (
  rect: NormalizedRect,
  lineWidth: number,
  strokeStyle: string,
  lineCap: CanvasLineCap,
  lineJoin: CanvasLineJoin,
): StrokeCommand[] | null => {
  const strokes: StrokeCommand[] = []
  const effectiveLineWidth = Math.max(lineWidth, MIN_FILL_SCANLINE_WIDTH)
  const top = rect.y
  const bottom = rect.y + rect.height
  const left = rect.x
  const right = rect.x + rect.width

  for (let y = top; y <= bottom; y += effectiveLineWidth) {
    if (strokes.length >= MAX_FILL_STROKES) {
      return null
    }

    strokes.push({
      mode: 'draw',
      strokeStyle,
      lineCap,
      lineJoin,
      lineWidth: effectiveLineWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: [
        { x: left, y: Math.min(bottom, y) },
        { x: right, y: Math.min(bottom, y) },
      ],
    })
  }

  return strokes
}

const toFillCircleStrokeCommands = (
  center: NormalizedPoint,
  radius: number,
  lineWidth: number,
  strokeStyle: string,
  lineCap: CanvasLineCap,
  lineJoin: CanvasLineJoin,
): StrokeCommand[] | null => {
  const strokes: StrokeCommand[] = []
  const effectiveLineWidth = Math.max(lineWidth, MIN_FILL_SCANLINE_WIDTH)
  const top = Math.max(0, center.y - radius)
  const bottom = Math.min(100, center.y + radius)

  for (let y = top; y <= bottom; y += effectiveLineWidth) {
    if (strokes.length >= MAX_FILL_STROKES) {
      return null
    }

    const dy = y - center.y
    const dx = Math.sqrt(Math.max(0, radius * radius - dy * dy))
    const left = Math.max(0, center.x - dx)
    const right = Math.min(100, center.x + dx)

    strokes.push({
      mode: 'draw',
      strokeStyle,
      lineCap,
      lineJoin,
      lineWidth: effectiveLineWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: [
        { x: left, y },
        { x: right, y },
      ],
    })
  }

  return strokes
}

const toFillPolygonStrokeCommands = (
  polygon: NormalizedPoint[],
  lineWidth: number,
  strokeStyle: string,
  lineCap: CanvasLineCap,
  lineJoin: CanvasLineJoin,
): StrokeCommand[] | null => {
  const strokes: StrokeCommand[] = []
  const effectiveLineWidth = Math.max(lineWidth, MIN_FILL_SCANLINE_WIDTH)
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of polygon) {
    if (point.y < minY) {
      minY = point.y
    }

    if (point.y > maxY) {
      maxY = point.y
    }
  }

  const boundedMinY = Math.max(0, minY)
  const boundedMaxY = Math.min(100, maxY)

  for (let y = boundedMinY; y <= boundedMaxY; y += effectiveLineWidth) {
    const intersections: number[] = []

    for (let index = 0; index < polygon.length; index += 1) {
      const nextIndex = (index + 1) % polygon.length
      const pointA = polygon[index]
      const pointB = polygon[nextIndex]

      const edgeCrosses =
        (pointA.y <= y && pointB.y > y) || (pointB.y <= y && pointA.y > y)

      if (!edgeCrosses) {
        continue
      }

      const x =
        pointA.x + ((y - pointA.y) * (pointB.x - pointA.x)) / (pointB.y - pointA.y)
      intersections.push(Math.max(0, Math.min(100, x)))
    }

    intersections.sort((first, second) => first - second)

    for (let index = 0; index + 1 < intersections.length; index += 2) {
      if (strokes.length >= MAX_FILL_STROKES) {
        return null
      }

      strokes.push({
        mode: 'draw',
        strokeStyle,
        lineCap,
        lineJoin,
        lineWidth: effectiveLineWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: [
          { x: intersections[index], y },
          { x: intersections[index + 1], y },
        ],
      })
    }
  }

  return strokes
}

export {
  toFillCircleStrokeCommands,
  toFillPolygonStrokeCommands,
  toFillRectStrokeCommands,
}
