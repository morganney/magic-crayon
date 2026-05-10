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
    expect(result.reason).toContain('at least two points')
    expect(getCommandApiStateV1(runtime).document.strokes).toHaveLength(0)
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
