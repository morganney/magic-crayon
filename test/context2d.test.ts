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

  it('serializes gradient stroke styles to a string in exported documents', () => {
    const { drawing, canvas } = setup()
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('2d context is required for test')
    }

    const gradient = context.createLinearGradient(0, 0, 100, 0)

    gradient.addColorStop(0, '#000000')
    gradient.addColorStop(1, '#ffffff')

    drawing.strokeStyle = gradient
    drawing.startDrawing(new DOMPoint(10, 10))
    drawing.draw(new DOMPoint(40, 20))
    drawing.stopDrawing()

    const document = drawing.getDocument()

    expect(typeof document.strokes[0]?.strokeStyle).toBe('string')
    expect(document.strokes[0]?.strokeStyle).toBe('#000000')
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

  it('covers closePath via protected draw path', () => {
    const { drawing } = setup()

    drawing.startDrawing(new DOMPoint(4, 5))
    ;(drawing as unknown as { closePath: () => void }).closePath()
    drawing.stopDrawing()

    expect(drawing.undoStackSize).toBe(1)
  })

  it('rejects when loading a data URL image fails', async () => {
    const { drawing } = setup()
    const originalImage = globalThis.Image

    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onerror?.()
      }
    }

    ;(globalThis as unknown as { Image: typeof Image }).Image =
      FailingImage as unknown as typeof Image

    await expect(drawing.setData('data:image/png;base64,broken')).rejects.toThrow(
      'Can not load data URL into canvas',
    )
    ;(globalThis as unknown as { Image: typeof Image }).Image = originalImage
  })

  it('rejects when FileReader load result is not a string', async () => {
    const { drawing } = setup()
    const originalFileReader = globalThis.FileReader

    class NonStringReader extends EventTarget {
      result: string | ArrayBuffer | null = new ArrayBuffer(8)

      readAsDataURL(_blob: Blob): void {
        this.dispatchEvent(new Event('load'))
      }
    }

    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      NonStringReader as unknown as typeof FileReader

    await expect(drawing.setData(new Blob(['x']))).rejects.toThrow(
      'Can not read blob as data URL',
    )
    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      originalFileReader
  })

  it('rejects when FileReader emits error', async () => {
    const { drawing } = setup()
    const originalFileReader = globalThis.FileReader

    class ErrorReader extends EventTarget {
      result: string | ArrayBuffer | null = null

      readAsDataURL(_blob: Blob): void {
        this.dispatchEvent(new Event('error'))
      }
    }

    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      ErrorReader as unknown as typeof FileReader

    await expect(drawing.setData(new Blob(['x']))).rejects.toThrow(
      'Can not read blob for canvas',
    )
    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      originalFileReader
  })

  it('rejects when FileReader load succeeds but image decode fails', async () => {
    const { drawing } = setup()
    const originalFileReader = globalThis.FileReader
    const originalImage = globalThis.Image

    class StringReader extends EventTarget {
      result: string | ArrayBuffer | null = 'data:image/png;base64,broken'

      readAsDataURL(_blob: Blob): void {
        this.dispatchEvent(new Event('load'))
      }
    }

    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onerror?.()
      }
    }

    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      StringReader as unknown as typeof FileReader
    ;(globalThis as unknown as { Image: typeof Image }).Image =
      FailingImage as unknown as typeof Image

    await expect(drawing.setData(new Blob(['x']))).rejects.toThrow(
      'Can not load data URL into canvas',
    )
    ;(globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      originalFileReader
    ;(globalThis as unknown as { Image: typeof Image }).Image = originalImage
  })

  it('rejects when canvas cannot create a blob', async () => {
    const { drawing, canvas } = setup()

    Object.defineProperty(canvas, 'toBlob', {
      configurable: true,
      value: (callback: BlobCallback) => callback(null),
    })

    await expect(drawing.getData(Serializations.BLOB)).rejects.toThrow(
      'Can not create blob for canvas',
    )
  })

  it('keeps the canvas cleared after rescale', () => {
    const { drawing, canvas } = setup()
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('2d context is required for test')
    }

    const getAlphaAt = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[3]

    drawing.lineWidth = 20
    drawing.strokeStyle = '#000000'

    drawing.startDrawing(new DOMPoint(20, 50))
    drawing.draw(new DOMPoint(180, 50))
    drawing.stopDrawing()

    expect(getAlphaAt(100, 50)).toBeGreaterThan(0)

    drawing.clear()

    expect(getAlphaAt(100, 50)).toBe(0)

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 200, 100),
    })

    drawing.rescale()

    expect(getAlphaAt(100, 50)).toBe(0)
  })

  it('restores erased content on undo and reapplies erase on redo', () => {
    const { drawing, canvas } = setup()
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('2d context is required for test')
    }

    drawing.pencilMode = Mode.DRAW
    drawing.compositing = Composites.DRAW
    drawing.lineWidth = 24
    drawing.startDrawing(new DOMPoint(20, 50))
    drawing.draw(new DOMPoint(180, 50))
    drawing.stopDrawing()

    const alphaAt = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[3]

    const alphaBeforeErase = alphaAt(100, 50)

    drawing.pencilMode = Mode.ERASE
    drawing.compositing = Composites.ERASE
    drawing.lineWidth = 34
    drawing.startDrawing(new DOMPoint(80, 50))
    drawing.draw(new DOMPoint(120, 50))
    drawing.stopDrawing()

    const alphaAfterErase = alphaAt(100, 50)

    drawing.applyUndo()

    const alphaAfterUndo = alphaAt(100, 50)

    drawing.applyRedo()

    const alphaAfterRedo = alphaAt(100, 50)

    expect(alphaBeforeErase).toBeGreaterThan(0)
    expect(alphaAfterErase).toBeLessThan(alphaBeforeErase)
    expect(alphaAfterUndo).toBeGreaterThan(alphaAfterErase)
    expect(alphaAfterRedo).toBeLessThan(alphaAfterUndo)
  })

  it('keeps undo and redo deterministic across resize', () => {
    const { drawing, canvas } = setup()
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('2d context is required for test')
    }

    drawing.pencilMode = Mode.DRAW
    drawing.compositing = Composites.DRAW
    drawing.lineWidth = 12
    drawing.startDrawing(new DOMPoint(20, 20))
    drawing.draw(new DOMPoint(180, 80))
    drawing.stopDrawing()

    const afterDraw = context.getImageData(0, 0, canvas.width, canvas.height)

    drawing.applyUndo()

    const afterUndo = context.getImageData(0, 0, canvas.width, canvas.height)

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 320, 180),
    })

    drawing.rescale()
    drawing.applyRedo()

    const afterRedoOnResize = context.getImageData(0, 0, canvas.width, canvas.height)

    expect(afterUndo.data).not.toStrictEqual(afterDraw.data)
    expect(afterRedoOnResize.data).not.toStrictEqual(afterUndo.data)
  })

  it('exports and imports DrawingDocumentV1 for replay', () => {
    const { drawing, canvas } = setup()
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('2d context is required for test')
    }

    drawing.pencilMode = Mode.DRAW
    drawing.compositing = Composites.DRAW
    drawing.lineWidth = 10
    drawing.startDrawing(new DOMPoint(20, 20))
    drawing.draw(new DOMPoint(180, 80))
    drawing.stopDrawing()

    const exported = drawing.getDocument()

    expect(exported.version).toBe(1)
    expect(exported.strokes.length).toBe(1)

    drawing.clear()
    drawing.setDocument(exported)

    const alpha = context.getImageData(100, 50, 1, 1).data[3]

    expect(alpha).toBeGreaterThan(0)
  })

  it('clamps imported document history to configured history limit', () => {
    const { drawing } = setup()

    drawing.setDocument({
      version: 1,
      strokes: Array.from({ length: 10 }, (_, index) => ({
        mode: Mode.DRAW,
        strokeStyle: '#000000',
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 5,
        compositing: Composites.DRAW,
        sourceWidth: 200,
        sourceHeight: 100,
        points: [
          { x: 10 + index, y: 10 },
          { x: 20 + index, y: 20 },
        ],
      })),
    })

    expect(drawing.undoStackSize).toBe(5)
  })

  it('undoes newest stroke first after setDocument', () => {
    const { drawing } = setup()

    drawing.setDocument({
      version: 1,
      strokes: [
        {
          mode: Mode.DRAW,
          strokeStyle: '#000000',
          lineCap: 'round',
          lineJoin: 'round',
          lineWidth: 5,
          compositing: Composites.DRAW,
          sourceWidth: 200,
          sourceHeight: 100,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        },
        {
          mode: Mode.DRAW,
          strokeStyle: '#111111',
          lineCap: 'round',
          lineJoin: 'round',
          lineWidth: 5,
          compositing: Composites.DRAW,
          sourceWidth: 200,
          sourceHeight: 100,
          points: [
            { x: 30, y: 10 },
            { x: 40, y: 20 },
          ],
        },
        {
          mode: Mode.DRAW,
          strokeStyle: '#222222',
          lineCap: 'round',
          lineJoin: 'round',
          lineWidth: 5,
          compositing: Composites.DRAW,
          sourceWidth: 200,
          sourceHeight: 100,
          points: [
            { x: 50, y: 10 },
            { x: 60, y: 20 },
          ],
        },
      ],
    })

    drawing.applyUndo()

    const document = drawing.getDocument()

    expect(document.strokes).toHaveLength(2)
    expect(document.strokes[0]?.points[0]?.x).toBe(10)
    expect(document.strokes[1]?.points[0]?.x).toBe(30)
  })

  it('preserves full replay history beyond undo depth', () => {
    const { drawing } = setup()

    for (let index = 0; index < 7; index += 1) {
      const x = 10 + index * 8

      drawing.startDrawing(new DOMPoint(x, 20))
      drawing.draw(new DOMPoint(x + 6, 26))
      drawing.stopDrawing()
    }

    const beforeUndo = drawing.getDocument()

    expect(beforeUndo.strokes.length).toBe(7)
    expect(drawing.undoStackSize).toBe(5)

    drawing.applyUndo()

    const afterUndo = drawing.getDocument()

    expect(afterUndo.strokes.length).toBe(6)
    expect(afterUndo.strokes[0]?.points[0]?.x).toBe(beforeUndo.strokes[0]?.points[0]?.x)
  })
})
