import { Composites, Context2D, Mode, Serializations } from './context2d.js'
import type { Context2DMetaData, CustomNumberEventListener } from './context2d.js'
import pencilSvg from '../assets/source/pencil.svg?raw'
import templateHtml from './template.html?raw'
import stylesCss from './styles.css?raw'

type MagicCrayonSerialization = 'blob' | 'dataurl'
type MagicCrayonColorPicker = 'crayon' | 'swatch'
type MagicCrayonSelectedCrayon = 'full' | 'clipped'
type MagicCrayonBoundary = 'on' | 'off'
type MagicCrayonDrawingData = Blob | string

type MagicCrayonSaveDetail = {
  data: MagicCrayonDrawingData
  serialization: MagicCrayonSerialization
  meta: Context2DMetaData
  timestamp: string
}

type AvailabilityDetail = {
  available: boolean
  size: number
}

const DEFAULT_SERIALIZATION: MagicCrayonSerialization = 'blob'
const DEFAULT_COLOR_PICKER: MagicCrayonColorPicker = 'crayon'
const DEFAULT_SELECTED_CRAYON: MagicCrayonSelectedCrayon = 'full'
const DEFAULT_BOUNDARY: MagicCrayonBoundary = 'on'
const DEFAULT_STROKE_WIDTH = 5
const DEFAULT_ERASER_SCALE = 1
const TAG_NAME = 'magic-crayon'

const COLORS = [
  '#000000',
  '#f9db00',
  '#f59b00',
  '#e30518',
  '#e60080',
  '#60378d',
  '#0091d3',
  '#56af31',
  '#9f5716',
] as const

const parser = new DOMParser()
const parseTemplateNode = (html: string): HTMLTemplateElement => {
  const document = parser.parseFromString(html, 'text/html')
  const node = document.querySelector('template#magic-crayon-template')

  if (!(node instanceof HTMLTemplateElement)) {
    throw new Error('Expected #magic-crayon-template in template.html.')
  }

  return node
}
const parseCrayonIcon = (svg: string): SVGElement => {
  const document = parser.parseFromString(svg, 'image/svg+xml')
  const node = document.documentElement

  if (!(node instanceof SVGElement) || node.tagName.toLowerCase() !== 'svg') {
    throw new Error('Expected a root SVG element in pencil.svg.')
  }

  return node
}
const template = parseTemplateNode(templateHtml)
const style = document.createElement('style')
const crayonIcon = parseCrayonIcon(pencilSvg)

style.textContent = stylesCss
template.content.prepend(style)

const serializationToEnum = {
  blob: Serializations.BLOB,
  dataurl: Serializations.DATA_URL,
} as const

const assertSerialization = (value: string | null): MagicCrayonSerialization => {
  if (value === 'blob' || value === 'dataurl') {
    return value
  }

  throw new TypeError('serialization must be either "blob" or "dataurl".')
}

const assertColorPicker = (value: string | null): MagicCrayonColorPicker => {
  if (value === 'crayon' || value === 'swatch') {
    return value
  }

  throw new TypeError('color-picker must be either "crayon" or "swatch".')
}

const assertSelectedCrayon = (value: string | null): MagicCrayonSelectedCrayon => {
  if (value === 'full' || value === 'clipped') {
    return value
  }

  throw new TypeError('selected-crayon must be either "full" or "clipped".')
}

const assertBoundary = (value: string | null): MagicCrayonBoundary => {
  if (value === 'on' || value === 'off') {
    return value
  }

  throw new TypeError('boundary must be either "on" or "off".')
}

const assertPositiveNumber = (value: number, name: string): number => {
  if (Number.isFinite(value) && value > 0) {
    return value
  }

  throw new TypeError(`${name} must be a positive number.`)
}

const assertStrokeWidth = (value: number): number =>
  assertPositiveNumber(value, 'stroke-width')

const assertEraserScale = (value: number): number =>
  assertPositiveNumber(value, 'eraser-scale')

const parseStrokeWidth = (value: string | null): number =>
  assertStrokeWidth(Number(value))

const parseEraserScale = (value: string | null): number =>
  assertEraserScale(Number(value))

class MagicCrayon extends HTMLElement {
  static observedAttributes = [
    'serialization',
    'color-picker',
    'selected-crayon',
    'boundary',
    'stroke-width',
    'eraser-scale',
  ]

  protected readonly root: ShadowRoot
  protected readonly wrap: HTMLDivElement
  protected readonly canvasWrap: HTMLDivElement
  protected readonly canvas: HTMLCanvasElement
  protected readonly controls: HTMLDivElement
  protected readonly menuButton: HTMLButtonElement
  protected readonly colors: HTMLDivElement
  protected readonly undoButton: HTMLButtonElement
  protected readonly redoButton: HTMLButtonElement
  protected readonly saveButton: HTMLButtonElement
  protected readonly clearButton: HTMLButtonElement
  protected readonly pencilButton: HTMLButtonElement
  protected readonly eraserButton: HTMLButtonElement

  protected context2d: Context2D | null = null
  protected resizeObserver: ResizeObserver | null = null
  protected teardown: Array<() => void> = []

  protected isDrawing = false
  protected activeMode: Mode | null = null
  protected selectedColor: string | null = null
  protected drawingValue: MagicCrayonDrawingData | null = null
  protected serializationValue: MagicCrayonSerialization = DEFAULT_SERIALIZATION
  protected colorPickerValue: MagicCrayonColorPicker = DEFAULT_COLOR_PICKER
  protected selectedCrayonValue: MagicCrayonSelectedCrayon = DEFAULT_SELECTED_CRAYON
  protected boundaryValue: MagicCrayonBoundary = DEFAULT_BOUNDARY
  protected strokeWidthValue: number = DEFAULT_STROKE_WIDTH
  protected eraserScaleValue: number = DEFAULT_ERASER_SCALE

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.root.appendChild(template.content.cloneNode(true))

    this.wrap = this.queryNode('.wrap')
    this.canvasWrap = this.queryNode('.canvas-wrap')
    this.canvas = this.queryNode('canvas')
    this.controls = this.queryNode('.controls')
    this.menuButton = this.queryNode('[data-action="menu"]')
    this.colors = this.queryNode('.colors')
    this.undoButton = this.queryNode('[data-action="undo"]')
    this.redoButton = this.queryNode('[data-action="redo"]')
    this.saveButton = this.queryNode('[data-action="save"]')
    this.clearButton = this.queryNode('[data-action="clear"]')
    this.pencilButton = this.queryNode('[data-tool="pencil"]')
    this.eraserButton = this.queryNode('[data-tool="eraser"]')

    this.renderColorButtons()
  }

  get serialization(): MagicCrayonSerialization {
    return this.serializationValue
  }

  set serialization(value: MagicCrayonSerialization) {
    const next = assertSerialization(value)

    this.serializationValue = next

    if (this.getAttribute('serialization') !== next) {
      this.setAttribute('serialization', next)
    }
  }

  get colorPicker(): MagicCrayonColorPicker {
    return this.colorPickerValue
  }

  set colorPicker(value: MagicCrayonColorPicker) {
    const next = assertColorPicker(value)

    this.colorPickerValue = next

    if (this.getAttribute('color-picker') !== next) {
      this.setAttribute('color-picker', next)
    }
  }

  get selectedCrayon(): MagicCrayonSelectedCrayon {
    return this.selectedCrayonValue
  }

  set selectedCrayon(value: MagicCrayonSelectedCrayon) {
    const next = assertSelectedCrayon(value)

    this.selectedCrayonValue = next
    this.colors.dataset.selectedCrayon = next

    if (this.getAttribute('selected-crayon') !== next) {
      this.setAttribute('selected-crayon', next)
    }
  }

  get boundary(): MagicCrayonBoundary {
    return this.boundaryValue
  }

  set boundary(value: MagicCrayonBoundary) {
    const next = assertBoundary(value)

    this.boundaryValue = next
    this.wrap.dataset.boundary = next

    if (this.getAttribute('boundary') !== next) {
      this.setAttribute('boundary', next)
    }
  }

  get strokeWidth(): number {
    return this.strokeWidthValue
  }

  set strokeWidth(value: number) {
    const next = assertStrokeWidth(value)

    this.strokeWidthValue = next
    this.syncLineWidthForActiveMode()

    if (this.getAttribute('stroke-width') !== String(next)) {
      this.setAttribute('stroke-width', String(next))
    }
  }

  get eraserScale(): number {
    return this.eraserScaleValue
  }

  set eraserScale(value: number) {
    const next = assertEraserScale(value)

    this.eraserScaleValue = next
    this.syncLineWidthForActiveMode()

    if (this.getAttribute('eraser-scale') !== String(next)) {
      this.setAttribute('eraser-scale', String(next))
    }
  }

  setAttribute(qualifiedName: string, value: string): void {
    if (qualifiedName === 'serialization') {
      assertSerialization(value)
    }

    if (qualifiedName === 'color-picker') {
      assertColorPicker(value)
    }

    if (qualifiedName === 'selected-crayon') {
      assertSelectedCrayon(value)
    }

    if (qualifiedName === 'boundary') {
      assertBoundary(value)
    }

    if (qualifiedName === 'stroke-width') {
      parseStrokeWidth(value)
    }

    if (qualifiedName === 'eraser-scale') {
      parseEraserScale(value)
    }

    super.setAttribute(qualifiedName, value)
  }

  get drawing(): MagicCrayonDrawingData | null {
    return this.drawingValue
  }

  set drawing(value: MagicCrayonDrawingData | null) {
    this.drawingValue = value

    if (value) {
      void this.setDrawingData(value)
    }
  }

  connectedCallback(): void {
    if (!this.hasAttribute('serialization')) {
      this.setAttribute('serialization', DEFAULT_SERIALIZATION)
    } else {
      this.serializationValue = assertSerialization(this.getAttribute('serialization'))
    }

    if (!this.hasAttribute('color-picker')) {
      this.setAttribute('color-picker', DEFAULT_COLOR_PICKER)
    } else {
      this.colorPickerValue = assertColorPicker(this.getAttribute('color-picker'))
    }

    if (!this.hasAttribute('selected-crayon')) {
      this.setAttribute('selected-crayon', DEFAULT_SELECTED_CRAYON)
    } else {
      this.selectedCrayonValue = assertSelectedCrayon(
        this.getAttribute('selected-crayon'),
      )
    }

    if (!this.hasAttribute('boundary')) {
      this.setAttribute('boundary', DEFAULT_BOUNDARY)
    } else {
      this.boundaryValue = assertBoundary(this.getAttribute('boundary'))
    }

    if (!this.hasAttribute('stroke-width')) {
      this.setAttribute('stroke-width', String(DEFAULT_STROKE_WIDTH))
    } else {
      this.strokeWidthValue = parseStrokeWidth(this.getAttribute('stroke-width'))
    }

    if (!this.hasAttribute('eraser-scale')) {
      this.setAttribute('eraser-scale', String(DEFAULT_ERASER_SCALE))
    } else {
      this.eraserScaleValue = parseEraserScale(this.getAttribute('eraser-scale'))
    }

    this.wrap.dataset.boundary = this.boundaryValue
    this.colors.dataset.selectedCrayon = this.selectedCrayonValue

    const context = this.canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context could not be created.')
    }

    this.context2d = new Context2D(context, {
      serialization: serializationToEnum[this.serializationValue],
    })

    this.bindUIEvents()
    this.bindCanvasEvents()
    this.bindStackListeners()
    this.bindResizeObserver()

    this.setInactiveToolState()
    this.setMenuOpen(false)
    this.handleResize()

    if (this.drawingValue) {
      void this.setDrawingData(this.drawingValue)
    }
  }

  disconnectedCallback(): void {
    for (const dispose of this.teardown) {
      dispose()
    }

    this.teardown = []
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.context2d = null
    this.isDrawing = false
    this.activeMode = null
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ) {
    if (name === 'serialization') {
      if (newValue === 'blob' || newValue === 'dataurl') {
        this.serializationValue = newValue
      }

      return
    }

    if (name === 'color-picker') {
      if (newValue === 'crayon' || newValue === 'swatch') {
        this.colorPickerValue = newValue
        this.renderColorButtons()
      }

      return
    }

    if (name === 'selected-crayon') {
      if (newValue === 'full' || newValue === 'clipped') {
        this.selectedCrayonValue = newValue
        this.colors.dataset.selectedCrayon = this.selectedCrayonValue
      }

      return
    }

    if (name === 'boundary') {
      if (newValue === 'on' || newValue === 'off') {
        this.boundaryValue = newValue
        this.wrap.dataset.boundary = this.boundaryValue
      }

      return
    }

    if (name === 'stroke-width') {
      this.strokeWidthValue = parseStrokeWidth(newValue)
      this.syncLineWidthForActiveMode()

      return
    }

    if (name === 'eraser-scale') {
      this.eraserScaleValue = parseEraserScale(newValue)
      this.syncLineWidthForActiveMode()

      return
    }
  }

  async getDrawingData(
    serialization: MagicCrayonSerialization = this.serializationValue,
  ): Promise<MagicCrayonDrawingData> {
    const mode = assertSerialization(serialization)
    const ctx = this.requireContext2D()

    return ctx.getData(serializationToEnum[mode])
  }

  async setDrawingData(data: MagicCrayonDrawingData): Promise<void> {
    this.drawingValue = data

    if (this.context2d) {
      await this.context2d.setData(data)
    }
  }

  clearDrawingData(): void {
    this.requireContext2D().clear()
  }

  protected queryNode<T extends Element>(selector: string): T {
    const node = this.root.querySelector<T>(selector)

    if (!node) {
      throw new Error(`Required node not found: ${selector}`)
    }

    return node
  }

  protected requireContext2D(): Context2D {
    if (!this.context2d) {
      throw new Error('magic-crayon is not connected.')
    }

    return this.context2d
  }

  protected toCoordinates(event: PointerEvent): DOMPoint {
    const rect = this.requireContext2D().getCanvasRect()

    return new DOMPoint(event.clientX - rect.x, event.clientY - rect.y)
  }

  protected renderColorButtons(): void {
    this.colors.dataset.picker = this.colorPickerValue
    this.colors.dataset.selectedCrayon = this.selectedCrayonValue

    this.colors.replaceChildren(
      ...COLORS.map(color => {
        const button = document.createElement('button')
        const icon = crayonIcon.cloneNode(true) as SVGElement

        button.type = 'button'
        button.className = 'swatch'
        button.setAttribute('data-color', color)
        button.setAttribute('aria-label', `Color ${color}`)
        button.setAttribute(
          'aria-pressed',
          this.activeMode === Mode.DRAW && this.selectedColor === color
            ? 'true'
            : 'false',
        )
        button.style.color = color

        if (this.colorPickerValue === 'swatch') {
          button.style.backgroundColor = color
          return button
        }

        icon.setAttribute('aria-hidden', 'true')
        icon.setAttribute('focusable', 'false')
        button.append(icon)

        return button
      }),
    )
  }

  protected syncColorSelectionState(): void {
    for (const item of this.colors.querySelectorAll<HTMLButtonElement>('.swatch')) {
      const isSelectedColor = item.dataset.color === this.selectedColor
      const isActiveDrawSelection = this.activeMode === Mode.DRAW && isSelectedColor

      item.setAttribute('aria-pressed', isActiveDrawSelection ? 'true' : 'false')
    }
  }

  protected bindUIEvents(): void {
    const onMenu = () => {
      this.setMenuOpen(this.wrap.dataset.menuOpen !== 'true')
    }

    const onTool = (event: Event) => {
      const target = event.currentTarget as HTMLButtonElement
      const tool = target.dataset.tool

      if (tool === 'eraser') {
        if (this.activeMode === Mode.ERASE) {
          this.setInactiveToolState()
          return
        }

        this.syncToolState(Mode.ERASE)
      }

      if (tool === 'pencil') {
        if (this.activeMode === Mode.DRAW) {
          this.setInactiveToolState()
          return
        }

        this.syncToolState(Mode.DRAW)
      }
    }

    const onColor = (event: Event) => {
      const target = event.target as HTMLElement
      const button = target.closest<HTMLButtonElement>('.swatch')
      const color = button?.dataset.color

      if (!color || !this.context2d) {
        return
      }

      if (this.selectedColor === color && this.activeMode === Mode.DRAW) {
        this.setInactiveToolState()
        return
      }

      this.selectedColor = color

      this.syncToolState(Mode.DRAW)
    }

    const onUndo = () => {
      const ctx = this.requireContext2D()

      if (ctx.undoStackSize > 0) {
        ctx.applyUndo()
      }
    }

    const onRedo = () => {
      const ctx = this.requireContext2D()

      if (ctx.redoStackSize > 0) {
        ctx.applyRedo()
      }
    }

    const onClear = () => {
      this.clearDrawingData()
    }

    const onSave = async () => {
      const ctx = this.requireContext2D()
      const data = await this.getDrawingData()

      this.dispatchEvent(
        new CustomEvent<MagicCrayonSaveDetail>('save', {
          bubbles: true,
          composed: true,
          detail: {
            data,
            serialization: this.serializationValue,
            meta: ctx.getMetaData(),
            timestamp: new Date().toISOString(),
          },
        }),
      )
    }

    this.menuButton.addEventListener('click', onMenu)
    this.pencilButton.addEventListener('click', onTool)
    this.eraserButton.addEventListener('click', onTool)
    this.undoButton.addEventListener('click', onUndo)
    this.redoButton.addEventListener('click', onRedo)
    this.clearButton.addEventListener('click', onClear)
    this.saveButton.addEventListener('click', onSave)

    this.colors.addEventListener('click', onColor)

    this.teardown.push(() => this.menuButton.removeEventListener('click', onMenu))
    this.teardown.push(() => this.pencilButton.removeEventListener('click', onTool))
    this.teardown.push(() => this.eraserButton.removeEventListener('click', onTool))
    this.teardown.push(() => this.undoButton.removeEventListener('click', onUndo))
    this.teardown.push(() => this.redoButton.removeEventListener('click', onRedo))
    this.teardown.push(() => this.clearButton.removeEventListener('click', onClear))
    this.teardown.push(() => this.saveButton.removeEventListener('click', onSave))
    this.teardown.push(() => this.colors.removeEventListener('click', onColor))
  }

  protected bindCanvasEvents(): void {
    const onPointerDown = (event: PointerEvent) => {
      if (!this.activeMode) {
        return
      }

      event.preventDefault()
      this.isDrawing = true
      this.canvas.setPointerCapture(event.pointerId)
      this.requireContext2D().startDrawing(this.toCoordinates(event))
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!this.isDrawing) {
        return
      }

      this.requireContext2D().draw(this.toCoordinates(event))
    }

    const stop = (event: PointerEvent) => {
      if (!this.isDrawing) {
        return
      }

      event.preventDefault()
      this.isDrawing = false
      this.requireContext2D().stopDrawing()

      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId)
      }
    }

    this.canvas.addEventListener('pointerdown', onPointerDown)
    this.canvas.addEventListener('pointermove', onPointerMove)
    this.canvas.addEventListener('pointerup', stop)
    this.canvas.addEventListener('pointercancel', stop)

    this.teardown.push(() =>
      this.canvas.removeEventListener('pointerdown', onPointerDown),
    )
    this.teardown.push(() =>
      this.canvas.removeEventListener('pointermove', onPointerMove),
    )
    this.teardown.push(() => this.canvas.removeEventListener('pointerup', stop))
    this.teardown.push(() => this.canvas.removeEventListener('pointercancel', stop))
  }

  protected bindStackListeners(): void {
    const ctx = this.requireContext2D()
    const onUndoSizeChange: CustomNumberEventListener = event => {
      const size = event.detail

      this.undoButton.disabled = size === 0
      this.dispatchEvent(
        new CustomEvent<AvailabilityDetail>('undoavailabilitychange', {
          bubbles: true,
          composed: true,
          detail: {
            available: size > 0,
            size,
          },
        }),
      )
    }

    const onRedoSizeChange: CustomNumberEventListener = event => {
      const size = event.detail

      this.redoButton.disabled = size === 0
      this.dispatchEvent(
        new CustomEvent<AvailabilityDetail>('redoavailabilitychange', {
          bubbles: true,
          composed: true,
          detail: {
            available: size > 0,
            size,
          },
        }),
      )
    }

    ctx.registerListeners(onUndoSizeChange, onRedoSizeChange)

    this.teardown.push(() => {
      ctx.unregisterListeners(onUndoSizeChange, onRedoSizeChange)
    })
  }

  protected bindResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize()
    })

    this.resizeObserver.observe(this)

    if (this.parentElement) {
      this.resizeObserver.observe(this.parentElement)
    }
  }

  protected handleResize(): void {
    if (!this.context2d) {
      return
    }

    const parent = this.parentElement ?? this
    const parentRect = parent.getBoundingClientRect()
    const controlsRect = this.controls.getBoundingClientRect()
    const canvasMaxHeight = Math.max(0, parentRect.height - controlsRect.height)

    if (canvasMaxHeight > 0) {
      this.canvasWrap.style.setProperty('--canvas-max-height', `${canvasMaxHeight}px`)
      this.wrap.style.maxWidth = `${canvasMaxHeight * (16 / 9)}px`
    }

    this.context2d.rescale()
  }

  protected syncToolState(mode: Mode): void {
    const ctx = this.requireContext2D()
    const isDraw = mode === Mode.DRAW

    this.activeMode = mode
    this.pencilButton.setAttribute('aria-pressed', isDraw ? 'true' : 'false')
    this.eraserButton.setAttribute('aria-pressed', isDraw ? 'false' : 'true')

    if (isDraw) {
      const active = this.selectedColor ?? COLORS[0]

      if (!this.selectedColor) {
        this.selectedColor = active
      }

      ctx.pencilMode = Mode.DRAW
      ctx.compositing = Composites.DRAW
      ctx.lineWidth = this.strokeWidthValue
      ctx.strokeStyle = active
    } else {
      ctx.pencilMode = Mode.ERASE
      ctx.compositing = Composites.ERASE
      ctx.lineWidth = this.strokeWidthValue * this.eraserScaleValue
    }

    this.syncCanvasCursor()
    this.syncColorSelectionState()
  }

  protected setInactiveToolState(): void {
    this.activeMode = null
    this.pencilButton.setAttribute('aria-pressed', 'false')
    this.eraserButton.setAttribute('aria-pressed', 'false')
    this.syncCanvasCursor()
    this.syncColorSelectionState()
  }

  protected syncCanvasCursor(): void {
    this.canvas.style.cursor = this.activeMode ? 'crosshair' : 'default'
  }

  protected setMenuOpen(open: boolean): void {
    this.wrap.dataset.menuOpen = open ? 'true' : 'false'
    this.menuButton.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  protected syncLineWidthForActiveMode(): void {
    const ctx = this.context2d

    if (!ctx || !this.activeMode) {
      return
    }

    if (this.activeMode === Mode.DRAW) {
      ctx.lineWidth = this.strokeWidthValue
      return
    }

    ctx.lineWidth = this.strokeWidthValue * this.eraserScaleValue
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MagicCrayon
  }

  interface GlobalEventHandlersEventMap {
    save: CustomEvent<MagicCrayonSaveDetail>
    undoavailabilitychange: CustomEvent<AvailabilityDetail>
    redoavailabilitychange: CustomEvent<AvailabilityDetail>
  }
}

export { MagicCrayon, TAG_NAME }
export type {
  AvailabilityDetail,
  MagicCrayonBoundary,
  MagicCrayonColorPicker,
  MagicCrayonDrawingData,
  MagicCrayonSaveDetail,
  MagicCrayonSelectedCrayon,
  MagicCrayonSerialization,
}
