import { Composites } from '../context2d.js'
import type { StrokeCommand } from '../context2d-document.js'
import {
  CIRCLE_SEGMENTS,
  DEFAULT_ARC_SEGMENTS,
  DEFAULT_BEZIER_SEGMENTS,
  DEFAULT_COLOR,
  SOURCE_SPACE_SIZE,
} from './constants.js'
import {
  isFiniteNumber,
  isNormalizedPoint,
  isNormalizedRect,
  toArcPoints,
  toBezierPoints,
  toEllipsePoints,
  toPolygonPoints,
  toRectOutlinePoints,
} from './geometry.js'
import {
  toFillCircleStrokeCommands,
  toFillPolygonStrokeCommands,
  toFillRectStrokeCommands,
} from './fill-strokes.js'
import type { MagicCrayonCommandV1 } from './types.js'

const toStrokeCommands = (command: MagicCrayonCommandV1): StrokeCommand[] | null => {
  if (
    command.kind !== 'draw-path' &&
    command.kind !== 'draw-line' &&
    command.kind !== 'erase-path' &&
    command.kind !== 'draw-circle' &&
    command.kind !== 'draw-rect' &&
    command.kind !== 'draw-bezier' &&
    command.kind !== 'draw-ellipse' &&
    command.kind !== 'draw-polygon' &&
    command.kind !== 'draw-arc' &&
    command.kind !== 'fill-rect' &&
    command.kind !== 'fill-circle' &&
    command.kind !== 'fill-polygon'
  ) {
    return null
  }

  if (command.kind === 'draw-circle') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (!isFiniteNumber(command.radius) || command.radius <= 0 || command.radius > 100) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const points: Array<{ x: number; y: number }> = []

    for (let index = 0; index <= CIRCLE_SEGMENTS; index += 1) {
      const theta = (index / CIRCLE_SEGMENTS) * Math.PI * 2
      const x = command.center.x + Math.cos(theta) * command.radius
      const y = command.center.y + Math.sin(theta) * command.radius

      points.push({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      })
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points,
      },
    ]
  }

  if (command.kind === 'draw-line') {
    if (!isNormalizedPoint(command.start) || !isNormalizedPoint(command.end)) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: [
          { x: command.start.x, y: command.start.y },
          { x: command.end.x, y: command.end.y },
        ],
      },
    ]
  }

  if (command.kind === 'draw-rect') {
    if (
      !isNormalizedRect(command.rect) ||
      command.rect.width <= 0 ||
      command.rect.height <= 0
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: toRectOutlinePoints(command.rect),
      },
    ]
  }

  if (command.kind === 'draw-bezier') {
    if (
      !isNormalizedPoint(command.start) ||
      !isNormalizedPoint(command.control1) ||
      !isNormalizedPoint(command.control2) ||
      !isNormalizedPoint(command.end)
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const segments = command.segments ?? DEFAULT_BEZIER_SEGMENTS

    if (!Number.isInteger(segments) || segments < 8 || segments > 128) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: toBezierPoints(
          command.start,
          command.control1,
          command.control2,
          command.end,
          segments,
        ),
      },
    ]
  }

  if (command.kind === 'draw-ellipse') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (
      !isFiniteNumber(command.radiusX) ||
      !isFiniteNumber(command.radiusY) ||
      command.radiusX <= 0 ||
      command.radiusY <= 0 ||
      command.radiusX > 100 ||
      command.radiusY > 100
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: toEllipsePoints(command.center, command.radiusX, command.radiusY),
      },
    ]
  }

  if (command.kind === 'draw-polygon') {
    if (command.points.length < 3) {
      return null
    }

    if (!command.points.every(point => isNormalizedPoint(point))) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: toPolygonPoints(command.points, command.closed !== false),
      },
    ]
  }

  if (command.kind === 'draw-arc') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (!isFiniteNumber(command.radius) || command.radius <= 0 || command.radius > 100) {
      return null
    }

    if (
      !isFiniteNumber(command.startAngleDegrees) ||
      !isFiniteNumber(command.endAngleDegrees)
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const segments = command.segments ?? DEFAULT_ARC_SEGMENTS

    if (!Number.isInteger(segments) || segments < 8 || segments > 128) {
      return null
    }

    if (command.startAngleDegrees === command.endAngleDegrees) {
      return null
    }

    return [
      {
        mode: 'draw',
        strokeStyle: command.style.color ?? DEFAULT_COLOR,
        lineCap: command.style.lineCap ?? 'round',
        lineJoin: command.style.lineJoin ?? 'round',
        lineWidth: command.style.strokeWidth,
        compositing: Composites.DRAW,
        sourceWidth: SOURCE_SPACE_SIZE,
        sourceHeight: SOURCE_SPACE_SIZE,
        points: toArcPoints(
          command.center,
          command.radius,
          command.startAngleDegrees,
          command.endAngleDegrees,
          command.counterclockwise ?? false,
          segments,
        ),
      },
    ]
  }

  if (command.kind === 'fill-rect') {
    if (
      !isNormalizedRect(command.rect) ||
      command.rect.width <= 0 ||
      command.rect.height <= 0
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return toFillRectStrokeCommands(
      command.rect,
      command.style.strokeWidth,
      command.style.color ?? DEFAULT_COLOR,
      command.style.lineCap ?? 'butt',
      command.style.lineJoin ?? 'round',
    )
  }

  if (command.kind === 'fill-circle') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (!isFiniteNumber(command.radius) || command.radius <= 0 || command.radius > 100) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return toFillCircleStrokeCommands(
      command.center,
      command.radius,
      command.style.strokeWidth,
      command.style.color ?? DEFAULT_COLOR,
      command.style.lineCap ?? 'butt',
      command.style.lineJoin ?? 'round',
    )
  }

  if (command.kind === 'fill-polygon') {
    if (command.points.length < 3) {
      return null
    }

    if (!command.points.every(point => isNormalizedPoint(point))) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return toFillPolygonStrokeCommands(
      command.points,
      command.style.strokeWidth,
      command.style.color ?? DEFAULT_COLOR,
      command.style.lineCap ?? 'butt',
      command.style.lineJoin ?? 'round',
    )
  }

  if (command.points.length < 2) {
    return null
  }

  if (!command.points.every(point => isNormalizedPoint(point))) {
    return null
  }

  if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
    return null
  }

  return [
    {
      mode: command.kind === 'draw-path' ? 'draw' : 'erase',
      strokeStyle:
        command.kind === 'draw-path'
          ? (command.style.color ?? DEFAULT_COLOR)
          : DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: command.kind === 'draw-path' ? Composites.DRAW : Composites.ERASE,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: command.points.map(point => ({
        x: point.x,
        y: point.y,
      })),
    },
  ]
}

export { toStrokeCommands }
