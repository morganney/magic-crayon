import { FixedStack, FixedStackEvents } from './fixed-stack.js'

const Dimensions = {
  WIDTH: 1280,
  HEIGHT: 720,
} as const
const Composites = {
  DRAW: 'source-over',
  ERASE: 'destination-out',
} as const
const Mode = {
  DRAW: 'draw',
  ERASE: 'erase',
} as const
const Serializations = {
  BLOB: 'blob',
  DATA_URL: 'dataurl',
} as const

type Mode = (typeof Mode)[keyof typeof Mode]
type Serializations = (typeof Serializations)[keyof typeof Serializations]
type Stroke = string | CanvasGradient | CanvasPattern
type ContextState = Partial<{
  strokeStyle: Stroke
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  lineWidth: number
  compositing: GlobalCompositeOperation
  serialization: Serializations
}>
type Context2DMetaData = {
  resolution: [width: string, height: string]
  view: [width: string, height: string]
  backgroundColor?: string
}
type CustomNumberEventListener = (evt: CustomEvent<number>) => void
type PolyLineRecord = {
  context: CanvasRenderingContext2D
  mode: Mode
  snapshotBefore: ImageData | null
  snapshotAfter: ImageData | null
}

class Context2D {
  protected readonly raster: CanvasRenderingContext2D
  protected mode: Mode = Mode.DRAW
  protected isDrawing: boolean = false
  protected viewWidth: number = Dimensions.WIDTH
  protected viewHeight: number = Dimensions.HEIGHT
  protected undo = new FixedStack<PolyLineRecord>(5)
  protected redo = new FixedStack<PolyLineRecord>(5)
  protected scaleFactor: number = Math.ceil(Math.max(2, devicePixelRatio))
  protected snapshot: ImageData = new ImageData(this.viewWidth, this.viewHeight)
  protected snapshotDirty: boolean = false
  protected serialization: Serializations = Serializations.BLOB
  protected activeStroke: PolyLineRecord | null = null

  constructor(context: CanvasRenderingContext2D, options?: ContextState) {
    this.raster = context
    this.resetState(this.raster, options)
    this.raster.imageSmoothingEnabled = false

    if (options?.serialization) {
      this.serialization = options.serialization
    }
  }

  set pencilMode(value: Mode) {
    this.mode = value
  }

  get width(): number {
    return this.viewWidth
  }

  set width(value: number) {
    this.viewWidth = value
  }

  get height(): number {
    return this.viewHeight
  }

  set height(value: number) {
    this.viewHeight = value
  }

  get scale(): number {
    return this.scaleFactor
  }

  get undoStackSize(): number {
    return this.undo.size
  }

  get redoStackSize(): number {
    return this.redo.size
  }

  get strokeStyle(): Stroke {
    return this.raster.strokeStyle
  }

  set strokeStyle(value: Stroke) {
    this.raster.strokeStyle = value
  }

  get lineWidth(): number {
    return this.raster.lineWidth
  }

  set lineWidth(value: number) {
    this.raster.lineWidth = value
  }

  get compositing(): GlobalCompositeOperation {
    return this.raster.globalCompositeOperation
  }

  set compositing(value: GlobalCompositeOperation) {
    this.raster.globalCompositeOperation = value
  }

  get lineCap(): CanvasLineCap {
    return this.raster.lineCap
  }

  set lineCap(value: CanvasLineCap) {
    this.raster.lineCap = value
  }

  get lineJoin(): CanvasLineJoin {
    return this.raster.lineJoin
  }

  set lineJoin(value: CanvasLineJoin) {
    this.raster.lineJoin = value
  }

  protected beginPath(): void {
    this.raster.beginPath()
    this.undo.peek().context.beginPath()
  }

  protected moveTo(posX: number, posY: number): void {
    this.raster.moveTo(posX, posY)
    this.undo.peek().context.moveTo(posX, posY)
  }

  protected lineTo(posX: number, posY: number): void {
    this.raster.lineTo(posX, posY)
    this.undo.peek().context.lineTo(posX, posY)
  }

  protected stroke(): void {
    this.raster.stroke()
    this.undo.peek().context.stroke()
  }

  protected closePath(): void {
    this.raster.closePath()
    this.undo.peek().context.closePath()
  }

  protected clearRect(): void {
    const { width, height } = this.raster.canvas

    this.raster.clearRect(0, 0, width, height)
  }

  protected drawImage(canvas: CanvasImageSource, scaled: boolean = false): void {
    if (scaled) {
      const { width, height } = this.raster.canvas

      this.raster.drawImage(
        canvas,
        0,
        0,
        width,
        height,
        0,
        0,
        this.viewWidth,
        this.viewHeight,
      )
    } else {
      this.raster.drawImage(canvas, 0, 0, this.viewWidth, this.viewHeight)
    }
  }

  protected save(): void {
    this.raster.save()
  }

  protected restore(): void {
    this.raster.restore()
  }

  protected setSnapshot(): void {
    const { canvas } = this.raster
    const width = Math.max(canvas.width, this.snapshot.width)
    const height = Math.max(canvas.height, this.snapshot.height)

    this.snapshot = this.raster.getImageData(0, 0, width - 1, height - 1)
    this.snapshotDirty = false
  }

  protected markSnapshotDirty(): void {
    this.snapshotDirty = true
  }

  protected syncSnapshotIfDirty(): void {
    if (!this.snapshotDirty) {
      return
    }

    this.setSnapshot()
  }

  protected scaleForRetina(ctx: CanvasRenderingContext2D, canvasRect: DOMRect): void {
    ctx.canvas.width = Math.round(canvasRect.width * this.scaleFactor)
    ctx.canvas.height = Math.round(canvasRect.height * this.scaleFactor)
    ctx.scale(this.scaleFactor, this.scaleFactor)
  }

  protected getState(): ContextState {
    return {
      strokeStyle: this.strokeStyle,
      lineCap: this.lineCap,
      lineWidth: this.lineWidth,
      lineJoin: this.lineJoin,
      compositing: this.compositing,
    }
  }

  protected copyState(
    to: CanvasRenderingContext2D,
    from?: CanvasRenderingContext2D,
  ): void {
    to.strokeStyle = from?.strokeStyle ?? this.strokeStyle
    to.lineCap = from?.lineCap ?? this.lineCap
    to.lineJoin = from?.lineJoin ?? this.lineJoin
    to.lineWidth = from?.lineWidth ?? this.lineWidth
    to.globalCompositeOperation = from?.globalCompositeOperation ?? this.compositing
  }

  protected resetState(to: CanvasRenderingContext2D, state?: ContextState) {
    to.strokeStyle = state?.strokeStyle ?? '#000000'
    to.lineWidth = state?.lineWidth ?? 5
    to.lineCap = state?.lineCap ?? 'round'
    to.lineJoin = state?.lineJoin ?? 'round'
    to.globalCompositeOperation = state?.compositing ?? 'source-over'
  }

  protected createOffscreenContext(): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const rect = this.raster.canvas.getBoundingClientRect()

    // Scale first because resizing canvas resets state
    this.scaleForRetina(ctx, rect)
    this.copyState(ctx)

    return ctx
  }

  protected cloneImageData(source: ImageData): ImageData {
    return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
  }

  protected putSnapshot(snapshot: ImageData): void {
    this.clearRect()
    this.raster.putImageData(snapshot, 0, 0)
  }

  protected pushUndo(context: CanvasRenderingContext2D): PolyLineRecord {
    const polyline: PolyLineRecord = {
      context,
      mode: this.mode,
      snapshotBefore:
        this.mode === Mode.ERASE ? this.cloneImageData(this.snapshot) : null,
      snapshotAfter: null,
    }

    context.globalCompositeOperation = Composites.DRAW
    this.undo.push(polyline)

    return polyline
  }

  protected setDataUrl(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        this.drawImage(img)
        this.setSnapshot()
        resolve()
      }
      img.onerror = () => {
        reject(new Error('Error. Can not load data URL into canvas.'))
      }
      img.src = dataUrl
    })
  }

  protected setBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.addEventListener('load', async () => {
        const dataUrl = reader.result

        if (typeof dataUrl !== 'string') {
          reject(new Error('Error. Can not read blob as data URL.'))

          return
        }

        try {
          await this.setDataUrl(dataUrl)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
      reader.addEventListener('error', () => {
        reject(new Error('Error. Can not read blob for canvas.'))
      })
      reader.readAsDataURL(blob)
    })
  }

  protected getDataUrl(): Promise<string> {
    return Promise.resolve(this.raster.canvas.toDataURL())
  }

  protected getBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.raster.canvas.toBlob(blob => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Error. Can not create blob for canvas.'))
        }
      })
    })
  }

  applyUndo(): void {
    const undo = this.undo.pop()

    if (undo.mode === Mode.ERASE && undo.snapshotBefore) {
      this.redo.push(undo)
      this.putSnapshot(undo.snapshotBefore)
      this.snapshot = this.cloneImageData(undo.snapshotBefore)
      this.snapshotDirty = false

      return
    }

    const origCompositeOp = undo.context.globalCompositeOperation

    this.redo.push(undo)
    this.save()

    undo.context.globalCompositeOperation =
      undo.mode === Mode.DRAW ? Composites.ERASE : Composites.DRAW
    this.copyState(this.raster, undo.context)

    this.drawImage(undo.context.canvas, true)

    undo.context.globalCompositeOperation = origCompositeOp
    this.restore()
    this.markSnapshotDirty()
  }

  applyRedo(): void {
    const redo = this.redo.pop()

    if (redo.mode === Mode.ERASE && redo.snapshotAfter) {
      this.undo.push(redo)
      this.putSnapshot(redo.snapshotAfter)
      this.snapshot = this.cloneImageData(redo.snapshotAfter)
      this.snapshotDirty = false

      return
    }

    const origCompositeOp = redo.context.globalCompositeOperation

    this.undo.push(redo)
    this.save()
    redo.context.globalCompositeOperation =
      redo.mode === Mode.ERASE ? Composites.ERASE : Composites.DRAW
    this.copyState(this.raster, redo.context)

    this.drawImage(redo.context.canvas)

    redo.context.globalCompositeOperation = origCompositeOp
    this.restore()
    this.markSnapshotDirty()
  }

  registerListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.undo.addEventListener(FixedStackEvents.SIZE_CHANGE, undo as EventListener)
    this.redo.addEventListener(FixedStackEvents.SIZE_CHANGE, redo as EventListener)
  }

  unregisterListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.undo.removeEventListener(FixedStackEvents.SIZE_CHANGE, undo as EventListener)
    this.redo.removeEventListener(FixedStackEvents.SIZE_CHANGE, redo as EventListener)
  }

  rescale(): void {
    const rect = this.raster.canvas.getBoundingClientRect()
    const state = this.getState()

    this.syncSnapshotIfDirty()

    this.viewWidth = rect.width
    this.viewHeight = rect.height
    this.scaleForRetina(this.raster, rect)
    this.resetState(this.raster, state)
    this.raster.putImageData(this.snapshot, 0, 0)
  }

  startDrawing(pos: DOMPoint): void {
    if (this.mode === Mode.ERASE) {
      this.syncSnapshotIfDirty()
    }

    this.isDrawing = true
    this.activeStroke = this.pushUndo(this.createOffscreenContext())
    this.redo.clear()
    this.beginPath()
    this.moveTo(pos.x, pos.y)
  }

  stopDrawing(): void {
    this.isDrawing = false

    if (this.activeStroke?.mode === Mode.ERASE) {
      this.syncSnapshotIfDirty()
      this.activeStroke.snapshotAfter = this.cloneImageData(this.snapshot)
    }

    this.activeStroke = null
  }

  draw(pos: DOMPoint): void {
    if (this.isDrawing) {
      this.lineTo(pos.x, pos.y)
      this.stroke()
      this.markSnapshotDirty()
    }
  }

  clear(): void {
    this.clearRect()
    this.setSnapshot()
  }

  getMetaData(): Context2DMetaData {
    const { width, height } = this.raster.canvas

    return {
      view: [this.width.toString(), this.height.toString()],
      resolution: [width.toString(), height.toString()],
      backgroundColor: '#ffffff',
    }
  }

  getCanvasRect(): DOMRect {
    return this.raster.canvas.getBoundingClientRect()
  }

  getData(
    serialization: Serializations = this.serialization,
  ): Promise<Blob> | Promise<string> {
    if (serialization === Serializations.BLOB) {
      return this.getBlob()
    }

    return this.getDataUrl()
  }

  async setData(data: Blob | string): Promise<void> {
    if (data instanceof Blob) {
      await this.setBlob(data)
    } else {
      await this.setDataUrl(data)
    }
  }
}

export { Context2D, Dimensions, Composites, Mode, Serializations }
export type { CustomNumberEventListener, Context2DMetaData }
