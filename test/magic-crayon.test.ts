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

    expect(() => {
      node.setAttribute('color-picker', 'invalid')
    }).toThrow(TypeError)

    expect(() => {
      node.setAttribute('selected-crayon', 'invalid')
    }).toThrow(TypeError)

    expect(() => {
      node.setAttribute('boundary', 'invalid')
    }).toThrow(TypeError)
  })

  it('defaults selected crayon visibility to full and allows clipped mode', () => {
    const node = createMagicCrayon()
    const colors = node.shadowRoot?.querySelector('.colors')

    expect(node.selectedCrayon).toBe('full')
    expect(node.getAttribute('selected-crayon')).toBe('full')
    expect(colors?.getAttribute('data-selected-crayon')).toBe('full')

    node.selectedCrayon = 'clipped'

    expect(node.getAttribute('selected-crayon')).toBe('clipped')
    expect(colors?.getAttribute('data-selected-crayon')).toBe('clipped')
  })

  it('defaults boundary cue to on and allows turning it off', () => {
    const node = createMagicCrayon()
    const wrap = node.shadowRoot?.querySelector('.wrap')

    expect(node.boundary).toBe('on')
    expect(node.getAttribute('boundary')).toBe('on')
    expect(wrap?.getAttribute('data-boundary')).toBe('on')

    node.boundary = 'off'

    expect(node.getAttribute('boundary')).toBe('off')
    expect(wrap?.getAttribute('data-boundary')).toBe('off')
  })

  it('defaults to crayon picker and allows switching to swatch', () => {
    const node = createMagicCrayon()
    const colors = node.shadowRoot?.querySelector('.colors')
    const crayonIcon = node.shadowRoot?.querySelector('.swatch svg')

    expect(node.colorPicker).toBe('crayon')
    expect(node.getAttribute('color-picker')).toBe('crayon')
    expect(colors?.getAttribute('data-picker')).toBe('crayon')
    expect(crayonIcon).toBeTruthy()

    node.colorPicker = 'swatch'

    const swatchIcon = node.shadowRoot?.querySelector('.swatch svg')
    const firstSwatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')

    expect(node.getAttribute('color-picker')).toBe('swatch')
    expect(colors?.getAttribute('data-picker')).toBe('swatch')
    expect(swatchIcon).toBeFalsy()
    expect(firstSwatch?.style.backgroundColor).toBeTruthy()
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
    const crayons = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const firstCrayonIcon = node.shadowRoot?.querySelector('.swatch svg')
    let undoEventCount = 0

    expect(canvas).toBeTruthy()
    expect(undo).toBeTruthy()
    expect(crayons?.length).toBeGreaterThan(0)
    expect(firstCrayonIcon).toBeTruthy()

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
    node.setAttribute('color-picker', 'swatch')
    node.drawing = ONE_PIXEL_PNG

    expect(node.serialization).toBe('dataurl')
    expect(node.colorPicker).toBe('swatch')
    expect(node.drawing).toBe(ONE_PIXEL_PNG)

    document.body.append(node)

    await node.setDrawingData(ONE_PIXEL_PNG)
    const data = await node.getDrawingData('dataurl')

    expect(typeof data).toBe('string')
    node.clearDrawingData()
  })

  it('throws when connected callback cannot get a 2d context', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => null,
    ) as typeof originalGetContext

    try {
      const node = document.createElement('magic-crayon') as MagicCrayon

      expect(() => {
        ;(node as unknown as { connectedCallback: () => void }).connectedCallback()
      }).toThrow('Canvas 2D context could not be created.')
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext
    }
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
    expect(() => {
      ;(node as unknown as { queryNode: (selector: string) => Element }).queryNode(
        '.does-not-exist',
      )
    }).toThrow('Required node not found')
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

  it('preserves selected color while switching picker modes', () => {
    const node = createMagicCrayon()
    const swatches = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const target = swatches?.item(1)

    expect(target).toBeTruthy()

    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(target?.getAttribute('aria-pressed')).toBe('true')

    node.colorPicker = 'swatch'

    const switched = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const switchedTarget = switched?.item(1)

    expect(switchedTarget?.getAttribute('aria-pressed')).toBe('true')
  })

  it('ignores color clicks that do not target a swatch', () => {
    const node = createMagicCrayon()
    const colors = node.shadowRoot?.querySelector<HTMLElement>('.colors')
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')

    expect(colors).toBeTruthy()
    expect(pencil?.getAttribute('aria-pressed')).toBe('false')

    colors?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(pencil?.getAttribute('aria-pressed')).toBe('false')
  })

  it('allows toggling an active tool off', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    let undoEventCount = 0

    expect(canvas && pencil && undo).toBeTruthy()

    node.addEventListener('undoavailabilitychange', () => {
      undoEventCount += 1
    })

    pencil?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pencil?.getAttribute('aria-pressed')).toBe('true')

    pencil?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pencil?.getAttribute('aria-pressed')).toBe('false')

    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 77,
        clientX: 16,
        clientY: 16,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 77,
        clientX: 32,
        clientY: 32,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 77,
        clientX: 32,
        clientY: 32,
      }),
    )

    expect(undoEventCount).toBe(0)
    expect(undo?.disabled).toBe(true)
  })

  it('allows toggling drawing off by clicking the active swatch', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    let undoEventCount = 0

    expect(canvas && pencil && swatch && undo).toBeTruthy()

    node.addEventListener('undoavailabilitychange', () => {
      undoEventCount += 1
    })

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pencil?.getAttribute('aria-pressed')).toBe('true')
    expect(swatch?.getAttribute('aria-pressed')).toBe('true')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pencil?.getAttribute('aria-pressed')).toBe('false')
    expect(swatch?.getAttribute('aria-pressed')).toBe('false')

    canvas?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 78,
        clientX: 20,
        clientY: 20,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 78,
        clientX: 34,
        clientY: 34,
      }),
    )
    canvas?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 78,
        clientX: 34,
        clientY: 34,
      }),
    )

    expect(undoEventCount).toBe(0)
    expect(undo?.disabled).toBe(true)
  })

  it('toggles tools menu and keeps it open until toggled again', () => {
    const node = createMagicCrayon()
    const wrap = node.shadowRoot?.querySelector<HTMLElement>('.wrap')
    const menu = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="menu"]')
    const pencil =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="pencil"]')

    expect(wrap && menu && pencil).toBeTruthy()
    expect(wrap?.dataset.menuOpen).toBe('false')
    expect(menu?.getAttribute('aria-expanded')).toBe('false')

    menu?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('true')
    expect(menu?.getAttribute('aria-expanded')).toBe('true')

    pencil?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('true')
    expect(menu?.getAttribute('aria-expanded')).toBe('true')

    menu?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('false')
    expect(menu?.getAttribute('aria-expanded')).toBe('false')
  })
})
