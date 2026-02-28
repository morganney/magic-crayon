import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '../../src/defined.js'
import type {
  AvailabilityDetail,
  MagicCrayon,
  SaveDetail,
} from '../../src/magic-crayon.js'

const createMagicCrayon = () => {
  const node = document.createElement('magic-crayon') as MagicCrayon

  document.body.append(node)

  return node
}

describe('playwright smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders and applies anchor/background attributes', () => {
    const node = createMagicCrayon()
    const wrap = node.shadowRoot?.querySelector<HTMLElement>('.wrap')

    node.anchor = 'center'
    node.canvasBackground = 'black'

    expect(node.getAttribute('anchor')).toBe('center')
    expect(wrap?.dataset.anchor).toBe('center')
    expect(node.getAttribute('canvas-background')).toBe('black')
    expect(wrap?.dataset.canvasBackground).toBe('black')
  })

  it('draws and emits undo availability', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')

    expect(canvas && swatch).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<AvailabilityDetail>>(resolve => {
      node.addEventListener(
        'undoavailabilitychange',
        event => resolve(event as CustomEvent<AvailabilityDetail>),
        { once: true },
      )
    })

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: 22,
        clientY: 22,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: 22,
        clientY: 22,
      }),
    )

    const event = await eventPromise

    expect(event.detail.available).toBe(true)
    expect(event.detail.size).toBeGreaterThan(0)
  })

  it('dispatches save payload', async () => {
    const node = createMagicCrayon()
    const saveButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="save"]')

    expect(saveButton).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<SaveDetail>>(resolve => {
      node.addEventListener('save', event => resolve(event as CustomEvent<SaveDetail>), {
        once: true,
      })
    })

    saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const event = await eventPromise

    expect(event.detail.meta.backgroundColor).toBe('#ffffff')
    expect(event.detail.serialization).toBe('blob')
    expect(typeof event.detail.timestamp).toBe('string')
  })
})
