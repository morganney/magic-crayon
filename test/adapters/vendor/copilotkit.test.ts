import { describe, expect, it } from 'vitest'

import { copilotKitAdapter } from '../../../src/adapters/vendor/copilotkit/adapter.js'

describe('copilotKitAdapter', () => {
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
})
