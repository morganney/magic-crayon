import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../src/defined.js'
import type {
  AvailabilityDetail,
  MagicCrayon,
  MagicCrayonSaveDetail,
} from '../src/magic-crayon.js'

const createMagicCrayon = () => {
  const node = document.createElement('magic-crayon') as MagicCrayon

  document.body.append(node)

  return node
}

const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8p0xQAAAAASUVORK5CYII='

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
        { once: true },
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
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')

    expect(canvas).toBeTruthy()
    expect(pencil).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<AvailabilityDetail>>(resolve => {
      node.addEventListener(
        'undoavailabilitychange',
        event => {
          resolve(event as CustomEvent<AvailabilityDetail>)
        },
        { once: true },
      )
    })

    pencil?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

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
        clientX: 20,
        clientY: 20,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: 20,
        clientY: 20,
      }),
    )

    const event = await eventPromise

    expect(event.detail.available).toBe(true)
    expect(event.detail.size).toBeGreaterThan(0)
  })

  it('does not draw before selecting a tool', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    let undoEventCount = 0

    expect(canvas).toBeTruthy()
    expect(undo).toBeTruthy()

    node.addEventListener('undoavailabilitychange', () => {
      undoEventCount += 1
    })

    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 2,
        clientX: 12,
        clientY: 12,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 2,
        clientX: 24,
        clientY: 24,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 2,
        clientX: 24,
        clientY: 24,
      }),
    )

    expect(undoEventCount).toBe(0)
    expect(undo?.disabled).toBe(true)
  })

  it('supports preset serialization and drawing values before connect', async () => {
    const node = document.createElement('magic-crayon') as MagicCrayon

    node.setAttribute('serialization', 'dataurl')
    node.drawing = ONE_PIXEL_PNG

    expect(node.serialization).toBe('dataurl')
    expect(node.drawing).toBe(ONE_PIXEL_PNG)

    document.body.append(node)

    await node.setDrawingData(ONE_PIXEL_PNG)
    const data = await node.getDrawingData('dataurl')

    expect(typeof data).toBe('string')
    node.clearDrawingData()
  })

  it('throws for API usage before connect and safely handles non-serialization attribute changes', async () => {
    const node = document.createElement('magic-crayon') as MagicCrayon

    expect(() => node.clearDrawingData()).toThrow('not connected')
    await expect(node.getDrawingData('blob')).rejects.toThrow('not connected')
    expect(() => {
      ;(
        node as unknown as { attributeChangedCallback: (...args: unknown[]) => void }
      ).attributeChangedCallback('other', null, 'blob')
    }).not.toThrow()
    expect(() => {
      ;(node as unknown as { handleResize: () => void }).handleResize()
    }).not.toThrow()
  })

  it('supports eraser, clear, undo, redo, and pointer capture release paths', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const clear = node.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="clear"]',
    )
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    const redo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="redo"]')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')

    expect(canvas && pencil && eraser && clear && undo && redo && swatch).toBeTruthy()

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('true')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pencil?.getAttribute('aria-pressed')).toBe('true')

    const releaseSpy = vi.fn()

    if (canvas) {
      Object.defineProperty(canvas, 'setPointerCapture', {
        value: vi.fn(),
        configurable: true,
      })
      Object.defineProperty(canvas, 'hasPointerCapture', {
        value: () => true,
        configurable: true,
      })
      Object.defineProperty(canvas, 'releasePointerCapture', {
        value: releaseSpy,
        configurable: true,
      })
    }

    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 99,
        clientX: 8,
        clientY: 8,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 99,
        clientX: 28,
        clientY: 18,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 99,
        clientX: 28,
        clientY: 18,
      }),
    )

    expect(releaseSpy).toHaveBeenCalledWith(99)

    undo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    redo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    clear?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    node.remove()
    expect(() => {
      ;(node as unknown as { disconnectedCallback: () => void }).disconnectedCallback()
    }).not.toThrow()
  })
})
