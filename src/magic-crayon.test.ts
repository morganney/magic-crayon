import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import './defined'
import type { AvailabilityDetail, MagicCrayon, MagicCrayonSaveDetail } from './magic-crayon'

const createMagicCrayon = () => {
  const node = document.createElement('magic-crayon') as MagicCrayon

  document.body.append(node)

  return node
}

describe('magic-crayon', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('throws when setting invalid serialization attribute', () => {
    const node = createMagicCrayon()

    expect(() => {
      node.setAttribute('serialization', 'invalid')
    }).toThrow(TypeError)
  })

  it('dispatches save event with payload detail', async () => {
    const node = createMagicCrayon()
    const eventPromise = new Promise<CustomEvent<MagicCrayonSaveDetail>>(resolve => {
      node.addEventListener(
        'save',
        event => {
          resolve(event as CustomEvent<MagicCrayonSaveDetail>)
        },
        { once: true }
      )
    })

    node.serialization = 'dataurl'
    node.shadowRoot
      ?.querySelector<HTMLButtonElement>('[data-action="save"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const event = await eventPromise

    expect(event.detail.serialization).toBe('dataurl')
    expect(typeof event.detail.data).toBe('string')
    expect(event.detail.meta.backgroundColor).toBe('#ffffff')
    expect(typeof event.detail.timestamp).toBe('string')
  })

  it('emits undo availability event after drawing', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')

    expect(canvas).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<AvailabilityDetail>>(resolve => {
      node.addEventListener(
        'undoavailabilitychange',
        event => {
          resolve(event as CustomEvent<AvailabilityDetail>)
        },
        { once: true }
      )
    })

    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: 20,
        clientY: 20
      })
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: 20,
        clientY: 20
      })
    )

    const event = await eventPromise

    expect(event.detail.available).toBe(true)
    expect(event.detail.size).toBeGreaterThan(0)
  })
})
