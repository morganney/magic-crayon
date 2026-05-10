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
