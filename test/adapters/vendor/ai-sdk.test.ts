import { describe, expect, it } from 'vitest'

import { aiSdkAdapter } from '../../../src/adapters/vendor/ai-sdk/adapter.js'

describe('aiSdkAdapter', () => {
  it('rejects non-object payloads', () => {
    const result = aiSdkAdapter.parse('not-an-object')

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for non-object payload.')
    }

    expect(result.reason).toContain('must be an object')
  })

  it('accepts direct commands arrays', () => {
    const result = aiSdkAdapter.parse({
      commands: [{ kind: 'clear' }, { kind: 'redo' }],
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'clear' }, { kind: 'redo' }])
  })

  it('accepts direct single command payloads', () => {
    const result = aiSdkAdapter.parse({
      command: { kind: 'undo' },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'undo' }])
  })

  it('accepts direct replace-document payloads', () => {
    const result = aiSdkAdapter.parse({
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

  it('maps toolName draw-path calls into v1 commands', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-path',
      input: {
        points: [
          { x: 10, y: 10 },
          { x: 90, y: 90 },
        ],
        style: {
          strokeWidth: 5,
          color: '#ff0000',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([
      {
        kind: 'draw-path',
        points: [
          { x: 10, y: 10 },
          { x: 90, y: 90 },
        ],
        style: {
          strokeWidth: 5,
          color: '#ff0000',
        },
      },
    ])
  })

  it('maps batch payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.batch',
      input: {
        commands: [
          {
            kind: 'clear',
          },
          {
            kind: 'undo',
          },
        ],
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands.map(command => command.kind)).toEqual(['clear', 'undo'])
  })

  it('maps batch payloads for magic_crayon prefix and args field', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic_crayon.batch',
      args: {
        commands: [{ kind: 'clear' }],
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands).toEqual([{ kind: 'clear' }])
  })

  it('rejects invalid batch payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.batch',
      input: {
        commands: [{ bad: true }],
      },
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for invalid batch payload.')
    }

    expect(result.reason).toContain('valid commands array')
  })

  it('rejects when neither commands, command, nor tool name is provided', () => {
    const result = aiSdkAdapter.parse({
      input: {},
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail when toolName is missing.')
    }

    expect(result.reason).toContain('toolName')
  })

  it('rejects unknown tool names', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.custom-tool',
      input: {},
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for unsupported tool.')
    }

    expect(result.reason).toContain('Unsupported AI SDK tool call')
  })

  it('maps draw-circle tool payloads with percent fields', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-circle',
      input: {
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

  it('maps draw-circle tool payloads with canonical fields', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-circle',
      arguments: {
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

  it('maps draw-line tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-line',
      input: {
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

    expect(result.commands).toEqual([
      {
        kind: 'draw-line',
        start: { x: 10, y: 20 },
        end: { x: 90, y: 80 },
        style: {
          strokeWidth: 3,
          color: '#3366cc',
        },
      },
    ])
  })

  it('maps draw-rect tool payloads with canonical fields', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-rect',
      input: {
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

  it('maps draw-bezier tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-bezier',
      input: {
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

  it('maps draw-ellipse tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-ellipse',
      input: {
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

  it('maps draw-polygon tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-polygon',
      input: {
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

  it('maps draw-arc tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-arc',
      input: {
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

  it('maps fill-rect tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.fill-rect',
      input: {
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

  it('maps fill-circle tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.fill-circle',
      input: {
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

  it('maps fill-circle style lineCap and lineJoin when provided', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.fill-circle',
      input: {
        center: { x: 50, y: 50 },
        radius: 15,
        style: {
          strokeWidth: 3,
          color: '#aa4444',
          lineCap: 'round',
          lineJoin: 'bevel',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]).toEqual({
      kind: 'fill-circle',
      center: { x: 50, y: 50 },
      radius: 15,
      style: {
        strokeWidth: 3,
        color: '#aa4444',
        lineCap: 'round',
        lineJoin: 'bevel',
      },
    })
  })

  it('maps fill-polygon tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.fill-polygon',
      input: {
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

  it('maps erase-path tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.erase-path',
      input: {
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        style: {
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('erase-path')
  })

  it('maps draw-rect percent payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-rect',
      input: {
        xPercent: 12,
        yPercent: 18,
        widthPercent: 28,
        heightPercent: 20,
        color: '#7a4a21',
        strokeWidth: 3,
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]).toEqual({
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
    })
  })

  it('maps erase-rect canonical payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.erase-rect',
      input: {
        rect: {
          x: 10,
          y: 12,
          width: 30,
          height: 22,
        },
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected a successful parse result.')
    }

    expect(result.commands[0]?.kind).toBe('erase-rect')
  })

  it('maps clear, undo, and redo tool payloads', () => {
    const clear = aiSdkAdapter.parse({ toolName: 'magic-crayon.clear', input: {} })
    const undo = aiSdkAdapter.parse({ toolName: 'magic-crayon.undo', input: {} })
    const redo = aiSdkAdapter.parse({ toolName: 'magic-crayon.redo', input: {} })

    expect(clear.ok && clear.commands[0]?.kind).toBe('clear')
    expect(undo.ok && undo.commands[0]?.kind).toBe('undo')
    expect(redo.ok && redo.commands[0]?.kind).toBe('redo')
  })

  it('maps erase-rect percent payloads', () => {
    const result = aiSdkAdapter.parse({
      tool: 'magic-crayon.erase-rect',
      input: {
        xPercent: 10,
        yPercent: 12,
        widthPercent: 30,
        heightPercent: 22,
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
          y: 12,
          width: 30,
          height: 22,
        },
      },
    ])
  })

  it('rejects invalid tool payloads', () => {
    const result = aiSdkAdapter.parse({
      toolName: 'magic-crayon.draw-path',
      input: {
        points: [{ x: 10, y: 10 }],
        style: { strokeWidth: 0 },
      },
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected parse to fail for invalid draw-path payload.')
    }

    expect(result.reason).toContain('Invalid AI SDK payload')
  })
})
