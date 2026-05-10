import { describe, expect, it } from 'vitest'

import { copilotKitAdapter } from '../../../src/adapters/vendor/copilotkit/adapter.js'

describe('copilotKitAdapter', () => {
  it('rejects non-object payloads', () => {
    const result = copilotKitAdapter.parse(10)

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for non-object payload.')
    }

    expect(result.reason).toContain('must be an object')
  })

  it('accepts direct commands arrays', () => {
    const result = copilotKitAdapter.parse({
      commands: [{ kind: 'clear' }, { kind: 'undo' }],
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'clear' }, { kind: 'undo' }])
  })

  it('maps action-based erase-rect calls into v1 commands', () => {
    const result = copilotKitAdapter.parse({
      name: 'magic-crayon.erase-rect',
      arguments: {
        rect: {
          x: 10,
          y: 15,
          width: 30,
          height: 20,
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'erase-rect',
        rect: {
          x: 10,
          y: 15,
          width: 30,
          height: 20,
        },
      },
    ])
  })

  it('accepts direct command payloads', () => {
    const result = copilotKitAdapter.parse({
      command: {
        kind: 'redo',
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'redo' }])
  })

  it('accepts direct replace-document payloads', () => {
    const result = copilotKitAdapter.parse({
      command: {
        kind: 'replace-document',
        document: {
          version: 1,
          strokes: [
            {
              mode: 'draw',
              strokeStyle: '#000000',
              lineCap: 'round',
              lineJoin: 'round',
              lineWidth: 5,
              compositing: 'source-over',
              sourceWidth: 100,
              sourceHeight: 100,
              points: [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
              ],
            },
          ],
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('replace-document')
  })

  it('rejects malformed payloads without action names', () => {
    const result = copilotKitAdapter.parse({
      payload: true,
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for invalid payload.')
    }

    expect(result.reason).toContain('action name')
  })

  it('supports batch action with underscore prefix and params field', () => {
    const result = copilotKitAdapter.parse({
      action: 'magic_crayon.batch',
      params: {
        commands: [{ kind: 'redo' }],
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'redo' }])
  })

  it('rejects invalid batch action payloads', () => {
    const result = copilotKitAdapter.parse({
      name: 'magic-crayon.batch',
      arguments: {
        commands: [{ bad: true }],
      },
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for invalid batch payload.')
    }

    expect(result.reason).toContain('valid commands array')
  })

  it('rejects unsupported action names', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.unknown',
      args: {},
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for unsupported action.')
    }

    expect(result.reason).toContain('Unsupported CopilotKit action')
  })

  it('rejects invalid tool payloads', () => {
    const result = copilotKitAdapter.parse({
      name: 'magic-crayon.draw-path',
      input: {
        points: [{ x: 10, y: 10 }],
        style: { strokeWidth: 0 },
      },
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for invalid draw-path payload.')
    }

    expect(result.reason).toContain('Invalid CopilotKit payload')
  })

  it('maps draw-circle action payloads with canonical fields', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-circle',
      args: {
        center: { x: 30, y: 30 },
        radius: 12,
        style: {
          strokeWidth: 2,
          color: '#33cc99',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-circle',
        center: { x: 30, y: 30 },
        radius: 12,
        style: {
          strokeWidth: 2,
          color: '#33cc99',
        },
      },
    ])
  })

  it('maps draw-circle action payloads with percent fields', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-circle',
      args: {
        centerXPercent: 55,
        centerYPercent: 35,
        radiusPercent: 8,
        color: '#ffaa00',
        strokeWidth: 3,
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-circle',
        center: { x: 55, y: 35 },
        radius: 8,
        style: {
          strokeWidth: 3,
          color: '#ffaa00',
        },
      },
    ])
  })

  it('maps draw-line action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-line',
      args: {
        start: { x: 10, y: 20 },
        end: { x: 90, y: 80 },
        style: {
          strokeWidth: 3,
          color: '#3366cc',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('draw-line')
  })

  it('maps draw-rect action payloads with canonical fields', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-rect',
      args: {
        rect: {
          x: 12,
          y: 18,
          width: 28,
          height: 20,
        },
        style: {
          strokeWidth: 3,
          color: '#7a4a21',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-rect',
        rect: {
          x: 12,
          y: 18,
          width: 28,
          height: 20,
        },
        style: {
          strokeWidth: 3,
          color: '#7a4a21',
        },
      },
    ])
  })

  it('maps draw-bezier action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-bezier',
      args: {
        start: { x: 10, y: 80 },
        control1: { x: 30, y: 20 },
        control2: { x: 70, y: 20 },
        end: { x: 90, y: 80 },
        style: {
          strokeWidth: 4,
          color: '#0066cc',
        },
        segments: 18,
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-bezier',
        start: { x: 10, y: 80 },
        control1: { x: 30, y: 20 },
        control2: { x: 70, y: 20 },
        end: { x: 90, y: 80 },
        style: {
          strokeWidth: 4,
          color: '#0066cc',
        },
        segments: 18,
      },
    ])
  })

  it('maps draw-ellipse action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-ellipse',
      args: {
        center: { x: 50, y: 48 },
        radiusX: 18,
        radiusY: 11,
        style: {
          strokeWidth: 3,
          color: '#11aa88',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-ellipse',
        center: { x: 50, y: 48 },
        radiusX: 18,
        radiusY: 11,
        style: {
          strokeWidth: 3,
          color: '#11aa88',
        },
      },
    ])
  })

  it('maps draw-polygon action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-polygon',
      args: {
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 20 },
          { x: 30, y: 42 },
        ],
        closed: true,
        style: {
          strokeWidth: 2,
          color: '#4477cc',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-polygon',
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 20 },
          { x: 30, y: 42 },
        ],
        closed: true,
        style: {
          strokeWidth: 2,
          color: '#4477cc',
        },
      },
    ])
  })

  it('maps draw-arc action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.draw-arc',
      args: {
        center: { x: 50, y: 50 },
        radius: 20,
        startAngleDegrees: 0,
        endAngleDegrees: 180,
        style: {
          strokeWidth: 3,
          color: '#ff8800',
        },
        segments: 12,
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
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
      },
    ])
  })

  it('maps fill-rect action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.fill-rect',
      args: {
        rect: { x: 20, y: 20, width: 30, height: 20 },
        style: {
          strokeWidth: 4,
          color: '#44aa44',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('fill-rect')
  })

  it('maps fill-circle action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.fill-circle',
      args: {
        center: { x: 50, y: 50 },
        radius: 15,
        style: {
          strokeWidth: 3,
          color: '#aa4444',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('fill-circle')
  })

  it('maps fill-polygon action payloads', () => {
    const result = copilotKitAdapter.parse({
      actionName: 'magic-crayon.fill-polygon',
      args: {
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 20 },
          { x: 30, y: 42 },
        ],
        style: {
          strokeWidth: 3,
          color: '#4488cc',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('fill-polygon')
  })
})
