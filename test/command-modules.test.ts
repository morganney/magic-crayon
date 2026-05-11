import { describe, expect, it } from 'vitest'

import {
  toFillCircleStrokeCommands,
  toFillPolygonStrokeCommands,
  toFillRectStrokeCommands,
} from '../src/command/fill-strokes.js'
import {
  isNormalizedPoint,
  isNormalizedRect,
  toArcPoints,
} from '../src/command/geometry.js'
import { executeCommandV1, type CommandRuntimeAdapterV1 } from '../src/command/runtime.js'
import { toStrokeCommands } from '../src/command/stroke-mapper.js'
import type { StrokeCommand } from '../src/context2d-document.js'
import type { MagicCrayonCommandV1 } from '../src/command/types.js'

const makeRuntime = (
  strokes: StrokeCommand[] = [],
  overrides: Partial<CommandRuntimeAdapterV1> = {},
): CommandRuntimeAdapterV1 => {
  return {
    getDocument: () => ({ version: 1, strokes }),
    setDocument: document => {
      strokes.splice(0, strokes.length, ...document.strokes)
    },
    clear: () => {
      strokes.splice(0, strokes.length)
    },
    undo: () => undefined,
    redo: () => undefined,
    getUndoSize: () => 0,
    getRedoSize: () => 0,
    ...overrides,
  }
}

const expectMapperReject = (command: MagicCrayonCommandV1): void => {
  expect(toStrokeCommands(command)).toBeNull()
}

describe('command geometry helpers', () => {
  it('returns false for non-object normalized point and rect values', () => {
    expect(isNormalizedPoint(null)).toBe(false)
    expect(isNormalizedRect(null)).toBe(false)
  })

  it('returns false for out-of-bounds normalized rect values', () => {
    expect(
      isNormalizedRect({
        x: 90,
        y: 20,
        width: 20,
        height: 20,
      }),
    ).toBe(false)
  })

  it('handles clockwise and counterclockwise arc wrap logic', () => {
    const clockwise = toArcPoints({ x: 50, y: 50 }, 10, 350, 10, false, 8)
    const counterclockwise = toArcPoints({ x: 50, y: 50 }, 10, 10, 350, true, 8)

    expect(clockwise.length).toBe(9)
    expect(counterclockwise.length).toBe(9)
  })
})

describe('fill stroke helper guards', () => {
  it('caps fill-rect scanline output for oversized helper inputs', () => {
    const strokes = toFillRectStrokeCommands(
      { x: 0, y: 0, width: 100, height: 200 },
      0.01,
      '#000',
      'butt',
      'round',
    )

    expect(strokes).toBeNull()
  })

  it('caps fill-polygon scanline output for high-intersection polygons', () => {
    const points = Array.from({ length: 60 }, (_, index) => ({
      x: (index / 59) * 100,
      y: index % 2 === 0 ? 0 : 100,
    }))

    const strokes = toFillPolygonStrokeCommands(points, 0.01, '#000', 'butt', 'round')

    expect(strokes).toBeNull()
  })

  it('generates fill-circle scanline strokes for valid input', () => {
    const strokes = toFillCircleStrokeCommands(
      { x: 50, y: 50 },
      10,
      0.01,
      '#000',
      'butt',
      'round',
    )

    expect(strokes).not.toBeNull()
    expect((strokes ?? []).length).toBeGreaterThan(1)
  })
})

describe('stroke mapper rejection branches', () => {
  it('rejects unsupported kind payloads', () => {
    expect(
      toStrokeCommands({ kind: 'noop' } as unknown as MagicCrayonCommandV1),
    ).toBeNull()
  })

  it('rejects invalid draw-circle payloads', () => {
    expectMapperReject({
      kind: 'draw-circle',
      center: { x: -1, y: 10 },
      radius: 10,
      style: { strokeWidth: 1 },
    })

    expectMapperReject({
      kind: 'draw-circle',
      center: { x: 10, y: 10 },
      radius: 0,
      style: { strokeWidth: 1 },
    })

    expectMapperReject({
      kind: 'draw-circle',
      center: { x: 10, y: 10 },
      radius: 10,
      style: { strokeWidth: 0 },
    })
  })

  it('rejects invalid draw-line and draw-rect payloads', () => {
    expectMapperReject({
      kind: 'draw-line',
      start: { x: -1, y: 10 },
      end: { x: 20, y: 20 },
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-line',
      start: { x: 10, y: 10 },
      end: { x: 20, y: 20 },
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'draw-rect',
      rect: { x: 10, y: 10, width: 0, height: 10 },
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-rect',
      rect: { x: 10, y: 10, width: 10, height: 10 },
      style: { strokeWidth: 0 },
    })
  })

  it('rejects invalid draw-bezier and draw-ellipse payloads', () => {
    expectMapperReject({
      kind: 'draw-bezier',
      start: { x: 10, y: 10 },
      control1: { x: 20, y: 20 },
      control2: { x: 30, y: 30 },
      end: { x: -1, y: 40 },
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-bezier',
      start: { x: 10, y: 10 },
      control1: { x: 20, y: 20 },
      control2: { x: 30, y: 30 },
      end: { x: 40, y: 40 },
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'draw-bezier',
      start: { x: 10, y: 10 },
      control1: { x: 20, y: 20 },
      control2: { x: 30, y: 30 },
      end: { x: 40, y: 40 },
      style: { strokeWidth: 2 },
      segments: 7,
    })

    expectMapperReject({
      kind: 'draw-ellipse',
      center: { x: -1, y: 50 },
      radiusX: 10,
      radiusY: 10,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-ellipse',
      center: { x: 50, y: 50 },
      radiusX: 101,
      radiusY: 10,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-ellipse',
      center: { x: 50, y: 50 },
      radiusX: 10,
      radiusY: 10,
      style: { strokeWidth: 0 },
    })
  })

  it('rejects invalid draw-polygon and draw-arc payloads', () => {
    expectMapperReject({
      kind: 'draw-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: -1, y: 30 },
      ],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: -1, y: 50 },
      radius: 10,
      startAngleDegrees: 0,
      endAngleDegrees: 90,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 0,
      startAngleDegrees: 0,
      endAngleDegrees: 90,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 10,
      startAngleDegrees: Number.NaN,
      endAngleDegrees: 90,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 10,
      startAngleDegrees: 0,
      endAngleDegrees: 90,
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 10,
      startAngleDegrees: 0,
      endAngleDegrees: 90,
      style: { strokeWidth: 2 },
      segments: 4,
    })

    expectMapperReject({
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 10,
      startAngleDegrees: 90,
      endAngleDegrees: 90,
      style: { strokeWidth: 2 },
    })
  })

  it('rejects invalid fill and path payloads', () => {
    expectMapperReject({
      kind: 'fill-rect',
      rect: { x: 10, y: 10, width: 0, height: 10 },
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'fill-rect',
      rect: { x: 10, y: 10, width: 10, height: 10 },
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'fill-circle',
      center: { x: -1, y: 50 },
      radius: 10,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'fill-circle',
      center: { x: 50, y: 50 },
      radius: 101,
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'fill-circle',
      center: { x: 50, y: 50 },
      radius: 10,
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'fill-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'fill-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: -1, y: 30 },
      ],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'fill-polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      style: { strokeWidth: 0 },
    })

    expectMapperReject({
      kind: 'draw-path',
      points: [{ x: 10, y: 10 }],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'erase-path',
      points: [
        { x: 10, y: 10 },
        { x: -1, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    expectMapperReject({
      kind: 'draw-path',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: { strokeWidth: 0 },
    })
  })
})

describe('command runtime fallback branches', () => {
  it('uses setDocument fallback for single-stroke append when appendStroke is absent', () => {
    const strokes: StrokeCommand[] = []
    const runtime = makeRuntime(strokes)

    const result = executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    expect(result.status).toBe('applied')
    expect(strokes).toHaveLength(1)
  })

  it('uses setDocument fallback for multi-stroke append when appendStroke is absent', () => {
    const strokes: StrokeCommand[] = []
    const runtime = makeRuntime(strokes)

    const result = executeCommandV1(runtime, {
      kind: 'fill-rect',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      style: { strokeWidth: 5 },
    })

    expect(result.status).toBe('applied')
    expect(strokes.length).toBeGreaterThan(1)
  })

  it('rejects invalid replace-document version and unsupported command kinds', () => {
    const runtime = makeRuntime()

    const invalidVersion = executeCommandV1(runtime, {
      kind: 'replace-document',
      document: { version: 2 as 1, strokes: [] },
    })

    const unsupported = executeCommandV1(runtime, {
      kind: 'nope',
    } as unknown as MagicCrayonCommandV1)

    expect(invalidVersion.status).toBe('rejected')
    expect(unsupported.status).toBe('rejected')
  })
})
