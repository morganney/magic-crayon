import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../src/defined.js'
import type {
  AvailabilityDetail,
  MagicCrayon,
  SaveDetail,
  WidthChangeDetail,
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

    expect(() => {
      node.setAttribute('control-style', 'invalid')
    }).toThrow(TypeError)

    expect(() => {
      node.setAttribute('width-controls', 'invalid')
    }).toThrow(TypeError)

    expect(() => {
      node.setAttribute('stroke-width', '0')
    }).toThrow(TypeError)

    expect(() => {
      node.setAttribute('eraser-scale', '0')
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

  it('defaults width controls to off and allows turning them on', () => {
    const node = createMagicCrayon()
    const wrap = node.shadowRoot?.querySelector('.wrap')

    expect(node.widthControls).toBe('off')
    expect(node.getAttribute('width-controls')).toBe('off')
    expect(wrap?.getAttribute('data-width-controls')).toBe('off')

    node.widthControls = 'on'

    expect(node.getAttribute('width-controls')).toBe('on')
    expect(wrap?.getAttribute('data-width-controls')).toBe('on')
  })

  it('defaults control style to icon and allows switching to text mode', () => {
    const node = createMagicCrayon()
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const clear = node.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="clear"]',
    )
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    const redo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="redo"]')

    expect(node.controlStyle).toBe('icon')
    expect(node.getAttribute('control-style')).toBe('icon')
    expect(eraser?.textContent?.trim()).toBe('')
    expect(eraser?.querySelector('svg')).toBeTruthy()
    expect(eraser?.getAttribute('aria-label')).toBe('Eraser')
    expect(eraser?.getAttribute('title')).toBe('eraser')
    expect(clear?.textContent?.trim()).toBe('')
    expect(clear?.querySelector('svg')).toBeTruthy()
    expect(clear?.getAttribute('aria-label')).toBe('Clear')
    expect(clear?.getAttribute('title')).toBe('trash')
    expect(undo?.getAttribute('title')).toBe('undo')
    expect(redo?.getAttribute('title')).toBe('redo')

    node.controlStyle = 'text'

    expect(node.getAttribute('control-style')).toBe('text')
    expect(eraser?.textContent).toBe('Eraser')
    expect(eraser?.querySelector('svg')).toBeNull()
    expect(eraser?.getAttribute('aria-label')).toBeNull()
    expect(eraser?.getAttribute('title')).toBe('eraser')
    expect(clear?.textContent).toBe('Clear')
    expect(clear?.querySelector('svg')).toBeNull()
    expect(clear?.getAttribute('aria-label')).toBeNull()
    expect(clear?.getAttribute('title')).toBe('trash')
    expect(clear?.classList.contains('is-icon')).toBe(false)
  })

  it('reverts control style to default when control-style attribute is removed', () => {
    const node = createMagicCrayon()
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const clear = node.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="clear"]',
    )

    expect(eraser && clear).toBeTruthy()

    node.controlStyle = 'text'

    expect(node.controlStyle).toBe('text')
    expect(node.getAttribute('control-style')).toBe('text')
    expect(eraser?.querySelector('svg')).toBeNull()
    expect(clear?.querySelector('svg')).toBeNull()

    node.removeAttribute('control-style')

    expect(node.controlStyle).toBe('icon')
    expect(node.getAttribute('control-style')).toBeNull()
    expect(eraser?.querySelector('svg')).toBeTruthy()
    expect(eraser?.getAttribute('aria-label')).toBe('Eraser')
    expect(clear?.querySelector('svg')).toBeTruthy()
    expect(clear?.getAttribute('aria-label')).toBe('Clear')
  })

  it('defaults stroke-width and eraser-scale and applies mode-specific line width', () => {
    const node = createMagicCrayon()
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const context2d = (node as unknown as { context2d?: { lineWidth: number } }).context2d

    expect(swatch && eraser && context2d).toBeTruthy()
    expect(node.strokeWidth).toBe(5)
    expect(node.eraserScale).toBe(1)
    expect(node.getAttribute('stroke-width')).toBe('5')
    expect(node.getAttribute('eraser-scale')).toBe('1')

    node.strokeWidth = 6
    node.eraserScale = 1.5

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(context2d?.lineWidth).toBe(6)

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(context2d?.lineWidth).toBe(9)

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(context2d?.lineWidth).toBe(6)
  })

  it('resets stroke-width and eraser-scale to defaults when attributes are removed', () => {
    const node = createMagicCrayon()
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const context2d = (node as unknown as { context2d?: { lineWidth: number } }).context2d
    const strokeSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="stroke"]',
    )
    const eraserSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="eraser"]',
    )

    expect(swatch && eraser && context2d && strokeSlider && eraserSlider).toBeTruthy()

    node.strokeWidth = 9
    node.eraserScale = 2

    expect(node.getAttribute('stroke-width')).toBe('9')
    expect(node.getAttribute('eraser-scale')).toBe('2')

    expect(() => node.removeAttribute('stroke-width')).not.toThrow()
    expect(() => node.removeAttribute('eraser-scale')).not.toThrow()

    expect(node.strokeWidth).toBe(5)
    expect(node.eraserScale).toBe(1)
    expect(node.getAttribute('stroke-width')).toBeNull()
    expect(node.getAttribute('eraser-scale')).toBeNull()
    expect(strokeSlider?.value).toBe('5')
    expect(eraserSlider?.value).toBe('1')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(context2d?.lineWidth).toBe(5)

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(context2d?.lineWidth).toBe(5)
  })

  it('updates width values from built-in sliders and dispatches widthchange', async () => {
    const node = createMagicCrayon()
    const strokeSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="stroke"]',
    )
    const eraserSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="eraser"]',
    )

    expect(strokeSlider && eraserSlider).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<WidthChangeDetail>>(resolve => {
      node.addEventListener(
        'widthchange',
        event => {
          resolve(event as CustomEvent<WidthChangeDetail>)
        },
        { once: true },
      )
    })

    if (!strokeSlider || !eraserSlider) {
      throw new Error('Width sliders not found')
    }

    strokeSlider.value = '9'
    strokeSlider.dispatchEvent(new Event('input', { bubbles: true }))

    const strokeEvent = await eventPromise

    expect(node.strokeWidth).toBe(9)
    expect(node.getAttribute('stroke-width')).toBe('9')
    expect(strokeEvent.detail.strokeWidth).toBe(9)
    expect(strokeEvent.detail.eraserScale).toBe(1)
    expect(strokeEvent.detail.eraserWidth).toBe(9)
    expect(strokeEvent.detail.source).toBe('stroke')

    const eraserEventPromise = new Promise<CustomEvent<WidthChangeDetail>>(resolve => {
      node.addEventListener(
        'widthchange',
        event => {
          resolve(event as CustomEvent<WidthChangeDetail>)
        },
        { once: true },
      )
    })

    eraserSlider.value = '2'
    eraserSlider.dispatchEvent(new Event('input', { bubbles: true }))

    const eraserEvent = await eraserEventPromise

    expect(node.eraserScale).toBe(2)
    expect(node.getAttribute('eraser-scale')).toBe('2')
    expect(eraserEvent.detail.strokeWidth).toBe(9)
    expect(eraserEvent.detail.eraserScale).toBe(2)
    expect(eraserEvent.detail.eraserWidth).toBe(18)
    expect(eraserEvent.detail.source).toBe('eraser')
  })

  it('accepts custom slotted width controls content', () => {
    const node = document.createElement('magic-crayon') as MagicCrayon
    const custom = document.createElement('div')

    custom.slot = 'width-controls'
    custom.textContent = 'Custom width controls'
    node.widthControls = 'on'
    node.append(custom)
    document.body.append(node)

    const slot = node.shadowRoot?.querySelector<HTMLSlotElement>(
      'slot[name="width-controls"]',
    )

    expect(slot?.assignedElements().length).toBe(1)
    expect(slot?.assignedElements()[0]?.textContent).toContain('Custom width controls')
  })

  it('defaults to crayon picker and allows switching to swatch and input', () => {
    const node = createMagicCrayon()
    const colors = node.shadowRoot?.querySelector('.colors')
    const crayonIcon = node.shadowRoot?.querySelector('.swatch svg')
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

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

    node.colorPicker = 'input'

    const colorInput =
      node.shadowRoot?.querySelector<HTMLInputElement>('.colors .color-input')

    expect(node.getAttribute('color-picker')).toBe('input')
    expect(colors?.getAttribute('data-picker')).toBe('input')
    expect(colorInput?.type).toBe('color')
    expect(colorInput?.value).toBe('#000000')
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')

    colorInput?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')

    if (!colorInput) {
      throw new Error('Color input not found')
    }

    colorInput.value = '#60378d'
    colorInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(canvas?.style.cursor).toBe('crosshair')
    expect(colorInput.value).toBe('#60378d')
  })

  it('dispatches save event with payload detail', async () => {
    const node = createMagicCrayon()
    const eventPromise = new Promise<CustomEvent<SaveDetail>>(resolve => {
      node.addEventListener(
        'save',
        event => {
          resolve(event as CustomEvent<SaveDetail>)
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
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')

    expect(canvas).toBeTruthy()
    expect(swatch).toBeTruthy()

    const eventPromise = new Promise<CustomEvent<AvailabilityDetail>>(resolve => {
      node.addEventListener(
        'undoavailabilitychange',
        event => {
          resolve(event as CustomEvent<AvailabilityDetail>)
        },
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

  it('applies preset selected/boundary/width-control and width attributes on connect', () => {
    const node = document.createElement('magic-crayon') as MagicCrayon

    node.setAttribute('selected-crayon', 'clipped')
    node.setAttribute('boundary', 'off')
    node.setAttribute('width-controls', 'on')
    node.setAttribute('stroke-width', '7')
    node.setAttribute('eraser-scale', '2')

    document.body.append(node)

    const colors = node.shadowRoot?.querySelector<HTMLElement>('.colors')
    const wrap = node.shadowRoot?.querySelector<HTMLElement>('.wrap')
    const strokeSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="stroke"]',
    )
    const eraserSlider = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="eraser"]',
    )

    expect(node.selectedCrayon).toBe('clipped')
    expect(node.boundary).toBe('off')
    expect(node.widthControls).toBe('on')
    expect(node.strokeWidth).toBe(7)
    expect(node.eraserScale).toBe(2)
    expect(colors?.dataset.selectedCrayon).toBe('clipped')
    expect(wrap?.dataset.boundary).toBe('off')
    expect(wrap?.dataset.widthControls).toBe('on')
    expect(strokeSlider?.value).toBe('7')
    expect(eraserSlider?.value).toBe('2')
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
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const clear = node.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="clear"]',
    )
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    const redo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="redo"]')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')

    expect(canvas && eraser && clear && undo && redo && swatch).toBeTruthy()

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('true')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')

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

  it('switches eraser icon when pressed state changes in icon mode', () => {
    const node = createMagicCrayon()
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(eraser).toBeTruthy()

    const initialIcon = eraser?.querySelector('svg')?.outerHTML

    expect(initialIcon).toBeTruthy()

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const activeIcon = eraser?.querySelector('svg')?.outerHTML

    expect(eraser?.getAttribute('aria-pressed')).toBe('true')
    expect(activeIcon).toBeTruthy()
    expect(activeIcon).not.toBe(initialIcon)

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const revertedIcon = eraser?.querySelector('svg')?.outerHTML

    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(revertedIcon).toBe(initialIcon)
  })

  it('returns early for non-standard ui handler event payloads', () => {
    const node = document.createElement('magic-crayon') as MagicCrayon
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const colors = node.shadowRoot?.querySelector<HTMLElement>('.colors')
    const strokeInput = node.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-width-input="stroke"]',
    )

    expect(eraser && colors && strokeInput).toBeTruthy()

    let toolHandler: ((event: Event) => void) | undefined
    let colorHandler: ((event: Event) => void) | undefined
    let widthHandler: ((event: Event) => void) | undefined

    const originalEraserAdd = eraser?.addEventListener.bind(eraser)
    const originalColorsAdd = colors?.addEventListener.bind(colors)
    const originalStrokeAdd = strokeInput?.addEventListener.bind(strokeInput)

    if (eraser && originalEraserAdd) {
      vi.spyOn(eraser, 'addEventListener').mockImplementation(
        (type, listener, options) => {
          if (type === 'click') {
            toolHandler = listener as (event: Event) => void
          }

          return originalEraserAdd(type, listener as EventListener, options)
        },
      )
    }

    if (colors && originalColorsAdd) {
      vi.spyOn(colors, 'addEventListener').mockImplementation(
        (type, listener, options) => {
          if (type === 'click') {
            colorHandler = listener as (event: Event) => void
          }

          return originalColorsAdd(type, listener as EventListener, options)
        },
      )
    }

    if (strokeInput && originalStrokeAdd) {
      vi.spyOn(strokeInput, 'addEventListener').mockImplementation(
        (type, listener, options) => {
          if (type === 'input') {
            widthHandler = listener as (event: Event) => void
          }

          return originalStrokeAdd(type, listener as EventListener, options)
        },
      )
    }

    document.body.append(node)

    expect(toolHandler).toBeTypeOf('function')
    expect(colorHandler).toBeTypeOf('function')
    expect(widthHandler).toBeTypeOf('function')

    toolHandler?.({ currentTarget: document.createElement('div') } as unknown as Event)
    colorHandler?.({ target: null } as unknown as Event)

    const swatchWithoutColor = document.createElement('button')

    swatchWithoutColor.className = 'swatch'
    colorHandler?.({ target: swatchWithoutColor } as unknown as Event)

    const invalidTarget = document.createElement('div')
    const unknownWidthInput = document.createElement('input')

    unknownWidthInput.value = '9'
    widthHandler?.({ currentTarget: invalidTarget } as unknown as Event)
    widthHandler?.({ currentTarget: unknownWidthInput } as unknown as Event)

    expect(node.strokeWidth).toBe(5)
    expect(node.eraserScale).toBe(1)
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
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(colors).toBeTruthy()
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')

    colors?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
  })

  it('selects a crayon when click originates from inner svg element', () => {
    const node = createMagicCrayon()
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const swatches = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const targetSwatch = swatches?.item(2)
    const targetSvg = targetSwatch?.querySelector('svg')

    expect(eraser && targetSwatch && targetSvg).toBeTruthy()
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(targetSwatch?.getAttribute('aria-pressed')).toBe('false')

    targetSvg?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(targetSwatch?.getAttribute('aria-pressed')).toBe('true')
  })

  it('allows toggling an active eraser tool off', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    let undoEventCount = 0

    expect(canvas && eraser && undo).toBeTruthy()

    node.addEventListener('undoavailabilitychange', () => {
      undoEventCount += 1
    })

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('true')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')

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
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const undo = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="undo"]')
    let undoEventCount = 0

    expect(canvas && eraser && swatch && undo).toBeTruthy()

    node.addEventListener('undoavailabilitychange', () => {
      undoEventCount += 1
    })

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(swatch?.getAttribute('aria-pressed')).toBe('true')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
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

  it('keeps swatch pressed state in sync when toggling draw and erase modes', () => {
    const node = createMagicCrayon()
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const swatches = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const swatch = swatches?.item(1)

    expect(eraser && swatch).toBeTruthy()

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(swatch?.getAttribute('aria-pressed')).toBe('true')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('true')
    expect(swatch?.getAttribute('aria-pressed')).toBe('false')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(swatch?.getAttribute('aria-pressed')).toBe('true')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eraser?.getAttribute('aria-pressed')).toBe('false')
    expect(swatch?.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps canvas cursor in sync with active drawing mode', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(canvas && swatch && eraser).toBeTruthy()
    expect(canvas?.style.cursor).toBe('default')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('crosshair')

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('default')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('cell')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('default')
  })

  it('supports draw-cursor and erase-cursor overrides', () => {
    const node = createMagicCrayon()
    const canvas = node.shadowRoot?.querySelector<HTMLCanvasElement>('canvas')
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(canvas && swatch && eraser).toBeTruthy()
    expect(node.drawCursor).toBe('crosshair')
    expect(node.eraseCursor).toBe('cell')

    node.drawCursor = 'pointer'
    node.eraseCursor = 'grab'

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('pointer')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(canvas?.style.cursor).toBe('grab')
  })

  it('syncs context line width when width values change in active modes', () => {
    const node = createMagicCrayon()
    const swatch = node.shadowRoot?.querySelector<HTMLButtonElement>('.swatch')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')
    const context2d = (node as unknown as { context2d?: { lineWidth: number } }).context2d

    expect(swatch && eraser && context2d).toBeTruthy()

    swatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    node.strokeWidth = 8
    expect(context2d?.lineWidth).toBe(8)

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    node.eraserScale = 2
    expect(context2d?.lineWidth).toBe(16)

    node.strokeWidth = 3
    expect(context2d?.lineWidth).toBe(6)
  })

  it('enters draw mode when selecting a swatch from fresh state', () => {
    const node = createMagicCrayon()
    const swatches = node.shadowRoot?.querySelectorAll<HTMLButtonElement>('.swatch')
    const blackSwatch = swatches?.item(0)
    const yellowSwatch = swatches?.item(1)

    expect(blackSwatch && yellowSwatch).toBeTruthy()
    expect(blackSwatch?.getAttribute('aria-pressed')).toBe('false')

    blackSwatch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(blackSwatch?.getAttribute('aria-pressed')).toBe('true')
    expect(yellowSwatch?.getAttribute('aria-pressed')).toBe('false')
  })

  it('toggles tools menu and keeps it open until toggled again', () => {
    const node = createMagicCrayon()
    const wrap = node.shadowRoot?.querySelector<HTMLElement>('.wrap')
    const menu = node.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="menu"]')
    const eraser =
      node.shadowRoot?.querySelector<HTMLButtonElement>('[data-tool="eraser"]')

    expect(wrap && menu && eraser).toBeTruthy()
    expect(wrap?.dataset.menuOpen).toBe('false')
    expect(menu?.getAttribute('aria-expanded')).toBe('false')

    menu?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('true')
    expect(menu?.getAttribute('aria-expanded')).toBe('true')

    eraser?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('true')
    expect(menu?.getAttribute('aria-expanded')).toBe('true')

    menu?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrap?.dataset.menuOpen).toBe('false')
    expect(menu?.getAttribute('aria-expanded')).toBe('false')
  })
})
