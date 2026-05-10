import { Context2DHistory } from './context2d-history.js'
import type { CustomNumberEventListener } from './context2d-history.js'
import type {
  DrawingDocumentV1,
  StrokeCommand,
  StrokePoint,
} from './context2d-document.js'

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
  backgroundColor: string
}>
type Context2DMetaData = {
  resolution: [width: string, height: string]
  view: [width: string, height: string]
  backgroundColor?: string
}

class Context2D {
  protected readonly raster: CanvasRenderingContext2D
  protected mode: Mode = Mode.DRAW
  protected isDrawing: boolean = false
  protected viewWidth: number = Dimensions.WIDTH
  protected viewHeight: number = Dimensions.HEIGHT
  protected history = new Context2DHistory()
  protected scaleFactor: number = Math.ceil(Math.max(2, devicePixelRatio))
  protected serialization: Serializations = Serializations.BLOB
  protected backgroundColor: string = '#ffffff'
  protected activeStroke: StrokeCommand | null = null

  constructor(context: CanvasRenderingContext2D, options?: ContextState) {
    this.raster = context
    this.resetState(this.raster, options)
    this.raster.imageSmoothingEnabled = false

    if (options?.serialization) {
      this.serialization = options.serialization
    }

    if (options?.backgroundColor) {
      this.backgroundColor = options.backgroundColor
    }
  }

  set canvasBackgroundColor(value: string) {
    this.backgroundColor = value
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
    return this.history.undoSize
  }

  get redoStackSize(): number {
    return this.history.redoSize
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
  }

  protected moveTo(posX: number, posY: number): void {
    this.raster.moveTo(posX, posY)
  }

  protected lineTo(posX: number, posY: number): void {
    this.raster.lineTo(posX, posY)
  }

  protected stroke(): void {
    this.raster.stroke()
  }

  protected closePath(): void {
    this.raster.closePath()
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

  protected copyState(to: CanvasRenderingContext2D, state: ContextState): void {
    to.strokeStyle = state.strokeStyle ?? '#000000'
    to.lineCap = state.lineCap ?? 'round'
    to.lineJoin = state.lineJoin ?? 'round'
    to.lineWidth = state.lineWidth ?? 5
    to.globalCompositeOperation = state.compositing ?? 'source-over'
  }

  protected resetState(to: CanvasRenderingContext2D, state?: ContextState) {
    to.strokeStyle = state?.strokeStyle ?? '#000000'
    to.lineWidth = state?.lineWidth ?? 5
    to.lineCap = state?.lineCap ?? 'round'
    to.lineJoin = state?.lineJoin ?? 'round'
    to.globalCompositeOperation = state?.compositing ?? 'source-over'
  }

  protected toStrokePoint(point: DOMPoint): StrokePoint {
    return {
      x: point.x,
      y: point.y,
    }
  }

  protected scalePoint(command: StrokeCommand, point: StrokePoint): DOMPoint {
    const sourceWidth = command.sourceWidth <= 0 ? 1 : command.sourceWidth
    const sourceHeight = command.sourceHeight <= 0 ? 1 : command.sourceHeight

    return new DOMPoint(
      (point.x / sourceWidth) * this.viewWidth,
      (point.y / sourceHeight) * this.viewHeight,
    )
  }

  protected replayCommands(): void {
    this.clearRect()

    for (const command of this.history.getCommands()) {
      this.drawCommand(command)
    }
  }

  protected drawCommand(command: StrokeCommand): void {
    const [start, ...rest] = command.points

    if (!start) {
      return
    }

    this.save()
    this.copyState(this.raster, {
      strokeStyle: command.strokeStyle,
      lineCap: command.lineCap,
      lineJoin: command.lineJoin,
      lineWidth: command.lineWidth,
      compositing: command.compositing,
    })

    const startPoint = this.scalePoint(command, start)

    this.raster.beginPath()
    this.raster.moveTo(startPoint.x, startPoint.y)

    for (const point of rest) {
      const next = this.scalePoint(command, point)

      this.raster.lineTo(next.x, next.y)
      this.raster.stroke()
    }

    this.restore()
  }

  protected setDataUrl(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        this.drawImage(img)
        this.history.clear()
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
    this.history.applyUndo()
    this.replayCommands()
  }

  applyRedo(): void {
    this.history.applyRedo()
    this.replayCommands()
  }

  registerListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.history.registerListeners(undo, redo)
  }

  unregisterListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.history.unregisterListeners(undo, redo)
  }

  rescale(): void {
    const rect = this.raster.canvas.getBoundingClientRect()
    const state = this.getState()

    this.viewWidth = rect.width
    this.viewHeight = rect.height
    this.scaleForRetina(this.raster, rect)
    this.resetState(this.raster, state)
    this.replayCommands()
    this.resetState(this.raster, state)
  }

  startDrawing(pos: DOMPoint): void {
    this.isDrawing = true
    this.activeStroke = {
      mode: this.mode,
      strokeStyle: this.strokeStyle,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      lineWidth: this.lineWidth,
      compositing: this.compositing,
      sourceWidth: this.viewWidth,
      sourceHeight: this.viewHeight,
      points: [this.toStrokePoint(pos)],
    }
    this.history.clearRedo()
    this.beginPath()
    this.moveTo(pos.x, pos.y)
  }

  stopDrawing(): void {
    this.isDrawing = false

    if (this.activeStroke) {
      this.history.add(this.activeStroke)
    }

    this.activeStroke = null
  }

  draw(pos: DOMPoint): void {
    if (!this.isDrawing) {
      return
    }

    if (this.activeStroke) {
      this.activeStroke.points.push(this.toStrokePoint(pos))
    }

    this.lineTo(pos.x, pos.y)
    this.stroke()
  }

  clear(): void {
    this.clearRect()
    this.history.clear()
    this.activeStroke = null
    this.isDrawing = false
  }

  getDocument(): DrawingDocumentV1 {
    return this.history.getDocument()
  }

  setDocument(document: DrawingDocumentV1): void {
    this.history.setDocument(document)
    this.replayCommands()
  }

  getMetaData(): Context2DMetaData {
    const { width, height } = this.raster.canvas

    return {
      view: [this.width.toString(), this.height.toString()],
      resolution: [width.toString(), height.toString()],
      backgroundColor: this.backgroundColor,
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
export type {
  CustomNumberEventListener,
  Context2DMetaData,
  StrokePoint,
  StrokeCommand,
  DrawingDocumentV1,
}
