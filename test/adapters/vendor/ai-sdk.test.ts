import { describe, expect, it } from 'vitest'

import { aiSdkAdapter } from '../../../src/adapters/vendor/ai-sdk/adapter.js'

describe('aiSdkAdapter', () => {
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
})
