import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Composites, Context2D, Mode, Serializations } from '../src/context2d.js'

const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8p0xQAAAAASUVORK5CYII='

const setup = () => {
  const canvas = document.createElement('canvas')

  canvas.width = 200
  canvas.height = 100
  canvas.style.width = '200px'
  canvas.style.height = '100px'
  document.body.append(canvas)

  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const drawing = new Context2D(context, {
    serialization: Serializations.BLOB,
  })

  return { canvas, drawing }
}

describe('Context2D', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('exposes state and metadata getters/setters', () => {
    const { drawing } = setup()

    drawing.width = 320
    drawing.height = 180
    drawing.strokeStyle = '#ff0000'
    drawing.lineWidth = 9
    drawing.compositing = Composites.DRAW
    drawing.lineCap = 'round'
    drawing.lineJoin = 'round'
    drawing.pencilMode = Mode.DRAW

    const meta = drawing.getMetaData()

    expect(drawing.width).toBe(320)
    expect(drawing.height).toBe(180)
    expect(drawing.strokeStyle).toBe('#ff0000')
    expect(drawing.lineWidth).toBe(9)
    expect(drawing.compositing).toBe(Composites.DRAW)
    expect(drawing.lineCap).toBe('round')
    expect(drawing.lineJoin).toBe('round')
    expect(drawing.scale).toBeGreaterThanOrEqual(2)
    expect(meta.backgroundColor).toBe('#ffffff')
  })

  it('supports drawing lifecycle with undo/redo and listeners', () => {
    const { drawing } = setup()
    const undoSizes: number[] = []
    const redoSizes: number[] = []
    const onUndo = (event: CustomEvent<number>) => undoSizes.push(event.detail)
    const onRedo = (event: CustomEvent<number>) => redoSizes.push(event.detail)

    drawing.registerListeners(onUndo, onRedo)
    drawing.startDrawing(new DOMPoint(10, 10))
    drawing.draw(new DOMPoint(20, 20))
    drawing.stopDrawing()

    expect(drawing.undoStackSize).toBe(1)
    expect(drawing.redoStackSize).toBe(0)

    drawing.applyUndo()
    expect(drawing.undoStackSize).toBe(0)
    expect(drawing.redoStackSize).toBe(1)

    drawing.applyRedo()
    expect(drawing.undoStackSize).toBe(1)
    expect(drawing.redoStackSize).toBe(0)
    expect(undoSizes.length).toBeGreaterThan(0)
    expect(redoSizes.length).toBeGreaterThan(0)

    drawing.unregisterListeners(onUndo, onRedo)
  })

  it('does not draw when not in drawing mode', () => {
    const { drawing } = setup()

    drawing.draw(new DOMPoint(12, 12))

    expect(drawing.undoStackSize).toBe(0)
    expect(drawing.redoStackSize).toBe(0)
  })

  it('gets and sets data as data URL and blob', async () => {
    const { drawing } = setup()
    const blob = await fetch(ONE_PIXEL_PNG).then(response => response.blob())

    await drawing.setData(ONE_PIXEL_PNG)
    await drawing.setData(blob)

    const asUrl = await drawing.getData(Serializations.DATA_URL)
    const asBlob = await drawing.getData(Serializations.BLOB)

    expect(typeof asUrl).toBe('string')
    expect((asUrl as string).startsWith('data:image/')).toBe(true)
    expect(asBlob instanceof Blob).toBe(true)
  })

  it('rescales and provides canvas rect', () => {
    const { drawing, canvas } = setup()

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 160, 90),
    })

    drawing.rescale()
    const rect = drawing.getCanvasRect()

    expect(rect.width).toBe(160)
    expect(rect.height).toBe(90)
  })
})
