import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Context2D, Serializations } from '../src/context2d.js'
import {
  createContext2DCommandRuntime,
  executeCommandBatchV1,
  executeCommandV1,
  getCommandApiStateV1,
  type CommandRuntimeAdapterV1,
} from '../src/command-runtime.js'
import type { MagicCrayonCommandV1 } from '../src/command-api.js'

const setupContextRuntime = () => {
  const canvas = document.createElement('canvas')

  canvas.width = 200
  canvas.height = 100
  canvas.style.width = '200px'
  canvas.style.height = '100px'
  document.body.append(canvas)

  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const drawing = new Context2D(context, {
    serialization: Serializations.BLOB,
  })

  return {
    runtime: createContext2DCommandRuntime(drawing),
  }
}

describe('command runtime helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('applies draw-path and updates state', () => {
    const { runtime } = setupContextRuntime()
    const command: MagicCrayonCommandV1 = {
      kind: 'draw-path',
      points: [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ],
      style: {
        strokeWidth: 5,
        color: '#ff0000',
      },
    }

    const result = executeCommandV1(runtime, command)
    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes).toHaveLength(1)
    expect(state.document.strokes[0]?.mode).toBe('draw')
    expect(state.undoSize).toBe(1)
    expect(state.redoSize).toBe(0)
  })

  it('uses appendStroke fast path when runtime provides it', () => {
    const strokes: Array<{
      mode: 'draw' | 'erase'
      strokeStyle: string
      lineCap: CanvasLineCap
      lineJoin: CanvasLineJoin
      lineWidth: number
      compositing: GlobalCompositeOperation
      sourceWidth: number
      sourceHeight: number
      points: Array<{ x: number; y: number }>
    }> = []
    let appendCalls = 0
    let setDocumentCalls = 0
    const runtime: CommandRuntimeAdapterV1 = {
      getDocument: () => ({ version: 1, strokes }),
      setDocument: document => {
        setDocumentCalls += 1
        strokes.splice(0, strokes.length, ...document.strokes)
      },
      appendStroke: stroke => {
        appendCalls += 1
        strokes.push(stroke)
      },
      clear: () => {
        strokes.splice(0, strokes.length)
      },
      undo: () => undefined,
      redo: () => undefined,
      getUndoSize: () => strokes.length,
      getRedoSize: () => 0,
    }

    const result = executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
      ],
      style: {
        strokeWidth: 4,
      },
    })

    expect(result.status).toBe('applied')
    expect(appendCalls).toBe(1)
    expect(setDocumentCalls).toBe(0)
    expect(strokes).toHaveLength(1)
  })

  it('rejects invalid path input without changing state', () => {
    const { runtime } = setupContextRuntime()
    const command: MagicCrayonCommandV1 = {
      kind: 'draw-path',
      points: [{ x: 25, y: 25 }],
      style: {
        strokeWidth: 4,
      },
    }

    const result = executeCommandV1(runtime, command)

    expect(result.status).toBe('rejected')
    expect(result.reason).toContain('valid normalized geometry')
    expect(getCommandApiStateV1(runtime).document.strokes).toHaveLength(0)
  })

  it('applies draw-circle and converts it to a replayable stroke', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-circle',
      center: { x: 50, y: 50 },
      radius: 20,
      style: {
        strokeWidth: 4,
        color: '#00aaff',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes).toHaveLength(1)
    expect(state.document.strokes[0]?.points.length).toBeGreaterThan(10)
    expect(state.document.strokes[0]?.mode).toBe('draw')
  })

  it('applies draw-line and records a two-point stroke', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-line',
      start: { x: 10, y: 20 },
      end: { x: 90, y: 80 },
      style: {
        strokeWidth: 3,
        color: '#3366cc',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes[0]?.points).toEqual([
      { x: 10, y: 20 },
      { x: 90, y: 80 },
    ])
  })

  it('applies draw-rect and records a closed outline stroke', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-rect',
      rect: {
        x: 20,
        y: 30,
        width: 40,
        height: 20,
      },
      style: {
        strokeWidth: 3,
        color: '#884422',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes).toHaveLength(1)
    expect(state.document.strokes[0]?.points).toEqual([
      { x: 20, y: 30 },
      { x: 60, y: 30 },
      { x: 60, y: 50 },
      { x: 20, y: 50 },
      { x: 20, y: 30 },
    ])
  })

  it('applies draw-bezier and records generated curve points', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-bezier',
      start: { x: 10, y: 80 },
      control1: { x: 30, y: 20 },
      control2: { x: 70, y: 20 },
      end: { x: 90, y: 80 },
      style: {
        strokeWidth: 4,
        color: '#0066cc',
      },
      segments: 16,
    })

    const state = getCommandApiStateV1(runtime)
    const points = state.document.strokes[0]?.points ?? []

    expect(result.status).toBe('applied')
    expect(state.document.strokes).toHaveLength(1)
    expect(points).toHaveLength(17)
    expect(points[0]).toEqual({ x: 10, y: 80 })
    expect(points[points.length - 1]).toEqual({ x: 90, y: 80 })
  })

  it('applies draw-ellipse and records sampled ellipse points', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-ellipse',
      center: { x: 50, y: 50 },
      radiusX: 20,
      radiusY: 10,
      style: {
        strokeWidth: 3,
        color: '#22aa88',
      },
    })

    const state = getCommandApiStateV1(runtime)
    const points = state.document.strokes[0]?.points ?? []

    expect(result.status).toBe('applied')
    expect(points.length).toBeGreaterThan(10)
    expect(points[0]?.x).toBeCloseTo(70)
    expect(points[0]?.y).toBeCloseTo(50)
  })

  it('applies draw-polygon and closes by default', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-polygon',
      points: [
        { x: 20, y: 20 },
        { x: 40, y: 20 },
        { x: 30, y: 40 },
      ],
      style: {
        strokeWidth: 2,
        color: '#8844cc',
      },
    })

    const state = getCommandApiStateV1(runtime)
    const points = state.document.strokes[0]?.points ?? []

    expect(result.status).toBe('applied')
    expect(points).toEqual([
      { x: 20, y: 20 },
      { x: 40, y: 20 },
      { x: 30, y: 40 },
      { x: 20, y: 20 },
    ])
  })

  it('applies draw-arc and records sampled arc points', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'draw-arc',
      center: { x: 50, y: 50 },
      radius: 20,
      startAngleDegrees: 0,
      endAngleDegrees: 180,
      style: {
        strokeWidth: 3,
        color: '#ff8800',
      },
      segments: 12,
    })

    const state = getCommandApiStateV1(runtime)
    const points = state.document.strokes[0]?.points ?? []

    expect(result.status).toBe('applied')
    expect(points).toHaveLength(13)
    expect(points[0]?.x).toBeCloseTo(70)
    expect(points[0]?.y).toBeCloseTo(50)
    expect(points[points.length - 1]?.x).toBeCloseTo(30)
    expect(points[points.length - 1]?.y).toBeCloseTo(50)
  })

  it('applies fill-rect by emitting multiple horizontal fill strokes', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'fill-rect',
      rect: { x: 20, y: 20, width: 30, height: 20 },
      style: {
        strokeWidth: 4,
        color: '#44aa44',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes.length).toBeGreaterThan(2)
    expect(state.document.strokes[0]?.points[0]?.x).toBeCloseTo(20)
    expect(state.document.strokes[0]?.points[1]?.x).toBeCloseTo(50)
  })

  it('applies fill-circle by emitting scanline-based fill strokes', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'fill-circle',
      center: { x: 50, y: 50 },
      radius: 15,
      style: {
        strokeWidth: 3,
        color: '#aa4444',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes.length).toBeGreaterThan(4)
  })

  it('applies fill-polygon by emitting interior scanline strokes', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'fill-polygon',
      points: [
        { x: 20, y: 20 },
        { x: 50, y: 20 },
        { x: 65, y: 45 },
        { x: 35, y: 60 },
      ],
      style: {
        strokeWidth: 3,
        color: '#4488cc',
      },
    })

    const state = getCommandApiStateV1(runtime)

    expect(result.status).toBe('applied')
    expect(state.document.strokes.length).toBeGreaterThan(4)
  })

  it('handles undo and redo with noop safeguards', () => {
    const { runtime } = setupContextRuntime()
    const undoOnEmpty: MagicCrayonCommandV1 = { kind: 'undo' }

    const before = executeCommandV1(runtime, undoOnEmpty)

    expect(before.status).toBe('noop')

    executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 10, y: 20 },
        { x: 80, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    const undone = executeCommandV1(runtime, { kind: 'undo' })
    const redone = executeCommandV1(runtime, { kind: 'redo' })

    expect(undone.status).toBe('applied')
    expect(redone.status).toBe('applied')
    expect(getCommandApiStateV1(runtime).document.strokes).toHaveLength(1)
  })

  it('clears redo history when a new draw command is appended after undo', () => {
    const { runtime } = setupContextRuntime()

    executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 10, y: 20 },
        { x: 80, y: 20 },
      ],
      style: { strokeWidth: 2 },
    })

    executeCommandV1(runtime, { kind: 'undo' })

    expect(getCommandApiStateV1(runtime).redoSize).toBe(1)

    executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 20, y: 30 },
        { x: 60, y: 30 },
      ],
      style: { strokeWidth: 2 },
    })

    const redoAfterNewDraw = executeCommandV1(runtime, { kind: 'redo' })

    expect(redoAfterNewDraw.status).toBe('noop')
    expect(getCommandApiStateV1(runtime).redoSize).toBe(0)
  })

  it('returns noop for clear on empty and applies clear when non-empty', () => {
    const { runtime } = setupContextRuntime()

    const emptyClear = executeCommandV1(runtime, { kind: 'clear' })

    expect(emptyClear.status).toBe('noop')

    executeCommandV1(runtime, {
      kind: 'draw-path',
      points: [
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      style: { strokeWidth: 3 },
    })

    const clear = executeCommandV1(runtime, { kind: 'clear' })

    expect(clear.status).toBe('applied')
    expect(getCommandApiStateV1(runtime).document.strokes).toHaveLength(0)
  })

  it('applies replace-document', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'replace-document',
      document: {
        version: 1,
        strokes: [
          {
            mode: 'draw',
            strokeStyle: '#000000',
            lineCap: 'round',
            lineJoin: 'round',
            lineWidth: 3,
            compositing: 'source-over',
            sourceWidth: 100,
            sourceHeight: 100,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ],
          },
        ],
      },
    })

    expect(result.status).toBe('applied')
    expect(getCommandApiStateV1(runtime).document.strokes).toHaveLength(1)
  })

  it('rejects erase-rect when bounds are invalid', () => {
    const { runtime } = setupContextRuntime()

    const result = executeCommandV1(runtime, {
      kind: 'erase-rect',
      rect: {
        x: 90,
        y: 10,
        width: 20,
        height: 20,
      },
    })

    expect(result.status).toBe('rejected')
    expect(result.reason).toContain('in-bounds')
  })

  it('rejects erase-rect when runtime has no eraseRect implementation', () => {
    const runtime: CommandRuntimeAdapterV1 = {
      getDocument: () => ({ version: 1, strokes: [] }),
      setDocument: () => undefined,
      clear: () => undefined,
      undo: () => undefined,
      redo: () => undefined,
      getUndoSize: () => 0,
      getRedoSize: () => 0,
    }

    const result = executeCommandV1(runtime, {
      kind: 'erase-rect',
      rect: {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
      },
    })

    expect(result.status).toBe('rejected')
    expect(result.reason).toContain('not implemented')
  })

  it('applies erase-rect when runtime implementation exists', () => {
    let erased = false
    const runtime: CommandRuntimeAdapterV1 = {
      getDocument: () => ({ version: 1, strokes: [] }),
      setDocument: () => undefined,
      clear: () => undefined,
      undo: () => undefined,
      redo: () => undefined,
      getUndoSize: () => 0,
      getRedoSize: () => 0,
      eraseRect: () => {
        erased = true
      },
    }

    const result = executeCommandV1(runtime, {
      kind: 'erase-rect',
      rect: {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
      },
    })

    expect(result.status).toBe('applied')
    expect(erased).toBe(true)
  })

  it('runs batches and reports ordered per-command results', () => {
    const { runtime } = setupContextRuntime()
    const batch = executeCommandBatchV1(runtime, [
      {
        kind: 'draw-path',
        points: [
          { x: 5, y: 5 },
          { x: 95, y: 95 },
        ],
        style: { strokeWidth: 2 },
      },
      {
        kind: 'erase-rect',
        rect: { x: 10, y: 10, width: 20, height: 20 },
      },
      { kind: 'undo' },
    ])

    expect(batch.version).toBe(1)
    expect(batch.results.map(item => item.status)).toEqual([
      'applied',
      'rejected',
      'applied',
    ])
  })

  it('supports erase-rect when adapter provides implementation', () => {
    const calls: Array<{ x: number; y: number; width: number; height: number }> = []
    const runtime: CommandRuntimeAdapterV1 = {
      getDocument: () => ({ version: 1, strokes: [] }),
      setDocument: () => {},
      clear: () => {},
      undo: () => {},
      redo: () => {},
      getUndoSize: () => 0,
      getRedoSize: () => 0,
      eraseRect: rect => calls.push(rect),
    }

    const result = executeCommandV1(runtime, {
      kind: 'erase-rect',
      rect: { x: 10, y: 10, width: 20, height: 20 },
    })

    expect(result.status).toBe('applied')
    expect(calls).toHaveLength(1)
  })
})
