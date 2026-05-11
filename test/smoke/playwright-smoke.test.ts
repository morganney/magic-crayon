import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '../../src/defined.js'
import type {
  AvailabilityDetail,
  MagicCrayon,
  SaveDetail,
  WidthChangeDetail,
} from '../../src/magic-crayon.js'

const createMagicCrayon = () => {
  const node = document.createElement('magic-crayon') as MagicCrayon

  document.body.append(node)

  return node
}

const wirePointerCaptureApis = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) {
    return
  }

  Object.defineProperty(canvas, 'setPointerCapture', {
    value: () => undefined,
    configurable: true,
  })
  Object.defineProperty(canvas, 'hasPointerCapture', {
    value: () => false,
    configurable: true,
  })
  Object.defineProperty(canvas, 'releasePointerCapture', {
    value: () => undefined,
    configurable: true,
  })
}

const dispatchStroke = (
  canvas: HTMLCanvasElement | null,
  start: { x: number; y: number },
  end: { x: number; y: number },
  pointerId = 1,
) => {
  canvas?.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      clientX: start.x,
      clientY: start.y,
    }),
  )
  canvas?.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      clientX: end.x,
      clientY: end.y,
    }),
  )
  canvas?.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      pointerId,
      clientX: end.x,
      clientY: end.y,
    }),
  )
}

const waitForAvailability = (
  node: MagicCrayon,
  eventName: 'undoavailabilitychange' | 'redoavailabilitychange',
  predicate: (detail: AvailabilityDetail) => boolean,
) => {
  return new Promise<CustomEvent<AvailabilityDetail>>(resolve => {
    const listener = (event: Event) => {
      const custom = event as CustomEvent<AvailabilityDetail>

      if (!predicate(custom.detail)) {
        return
      }

      node.removeEventListener(eventName, listener)
      resolve(custom)
    }

    node.addEventListener(eventName, listener)
  })
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

    wirePointerCaptureApis(canvas ?? null)

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    dispatchStroke(canvas ?? null, { x: 10, y: 10 }, { x: 22, y: 22 })

    const event = await eventPromise

    expect(event.detail.available).toBe(true)
    expect(event.detail.size).toBeGreaterThan(0)
  })

  it('supports undo then redo and emits availability transitions', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const undoButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    const redoButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="redo"]')

    expect(canvas && swatch && undoButton && redoButton).toBeTruthy()

    wirePointerCaptureApis(canvas ?? null)
    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const undoAvailable = waitForAvailability(
      node,
      'undoavailabilitychange',
      detail => detail.available,
    )
    dispatchStroke(canvas ?? null, { x: 12, y: 12 }, { x: 26, y: 26 }, 7)
    await undoAvailable

    const redoAvailable = waitForAvailability(
      node,
      'redoavailabilitychange',
      detail => detail.available,
    )
    undoButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const redoEvent = await redoAvailable

    expect(redoEvent.detail.available).toBe(true)

    const undoRestored = waitForAvailability(
      node,
      'undoavailabilitychange',
      detail => detail.available,
    )
    redoButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const undoEvent = await undoRestored

    expect(undoEvent.detail.available).toBe(true)
  })

  it('clears drawing and resets undo/redo button availability', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const clearButton = node.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="clear"]',
    )
    const undoButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    const redoButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="redo"]')

    expect(canvas && swatch && clearButton && undoButton && redoButton).toBeTruthy()

    wirePointerCaptureApis(canvas ?? null)
    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const undoAvailable = waitForAvailability(
      node,
      'undoavailabilitychange',
      detail => detail.available,
    )
    dispatchStroke(canvas ?? null, { x: 15, y: 15 }, { x: 30, y: 30 }, 8)
    await undoAvailable

    const undoReset = waitForAvailability(
      node,
      'undoavailabilitychange',
      detail => !detail.available,
    )
    clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await undoReset

    expect(undoButton?.disabled).toBe(true)
    expect(redoButton?.disabled).toBe(true)
  })

  it('erases and emits undo availability when eraser mode is active', async () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const eraserButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(canvas && eraserButton).toBeTruthy()

    wirePointerCaptureApis(canvas ?? null)
    eraserButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const undoAvailable = waitForAvailability(
      node,
      'undoavailabilitychange',
      detail => detail.available,
    )

    dispatchStroke(canvas ?? null, { x: 20, y: 20 }, { x: 28, y: 28 }, 9)
    const event = await undoAvailable

    expect(event.detail.available).toBe(true)
    expect(event.detail.size).toBeGreaterThan(0)
  })

  it('dispatches save payload with document when saveDocument is enabled', async () => {
    const node = createMagicCrayon()
    const saveButton =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="save"]')

    node.saveDocument = 'on'

    expect(saveButton).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<SaveDetail>>(resolve => {
      node.addEventListener('save', event => resolve(event as CustomEvent<SaveDetail>), {
        once: true,
      })
    })

    saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const event = await eventPromise

    expect(event.detail.document).toBeTruthy()
    expect(event.detail.document?.version).toBe(1)
    expect(Array.isArray(event.detail.document?.strokes)).toBe(true)
  })

  it('emits widthchange when stroke width control changes', async () => {
    const node = createMagicCrayon()
    const strokeInput = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="stroke"]',
    )

    expect(strokeInput).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<WidthChangeDetail>>(resolve => {
      node.addEventListener(
        'widthchange',
        event => resolve(event as CustomEvent<WidthChangeDetail>),
        { once: true },
      )
    })

    if (strokeInput) {
      strokeInput.value = '7'
      strokeInput.dispatchEvent(new Event('input', { bubbles: true }))
    }

    const event = await eventPromise

    expect(event.detail.source).toBe('stroke')
    expect(event.detail.strokeWidth).toBe(7)
    expect(event.detail.eraserScale).toBeGreaterThan(0)
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
