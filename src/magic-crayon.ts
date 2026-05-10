import { Composites, Context2D, Mode } from './context2d.js'
import type { CustomNumberEventListener } from './context2d.js'
import pencilSvg from '../assets/pencil.svg?raw'
import eraserSvg from '../assets/eraser.svg?raw'
import eraserFilledSvg from '../assets/eraser-filled.svg?raw'
import trashSvg from '../assets/trash.svg?raw'
import undoSvg from '../assets/undo.svg?raw'
import templateHtml from './template.html?raw'
import stylesCss from './styles.css?raw'
import {
  createContext2DCommandRuntime,
  executeCommandBatchV1,
  executeCommandV1,
  getCommandApiStateV1,
} from './command-runtime.js'
import {
  assertAnchor,
  assertBoundary,
  assertCanvasBackground,
  assertColorPicker,
  assertControlStyle,
  assertEraserScale,
  assertSaveDocument,
  assertSelectedCrayon,
  assertSerialization,
  assertStrokeWidth,
  assertWidthControls,
  isElement,
  isHTMLButtonElement,
  isHTMLInputElement,
  parseAssetIcon,
  parseCrayonIcon,
  parseActionIcon,
  parseEraserScale,
  parseStrokeWidth,
  parseTemplateNode,
  serializationToEnum,
  toSvgElement,
} from './helpers.js'
import type {
  Anchor,
  AvailabilityDetail,
  Boundary,
  CanvasBackground,
  ColorPicker,
  ControlStyle,
  CursorStyle,
  DrawingData,
  SaveDetail,
  SaveDocument,
  SelectedCrayon,
  Serialization,
  WidthControls,
  WidthChangeDetail,
} from './types.js'
import type {
  CommandApiStateV1,
  CommandExecutionResultV1,
  MagicCrayonCommandV1,
} from './command-api.js'

const DEFAULT_SERIALIZATION: Serialization = 'blob'
const DEFAULT_COLOR_PICKER: ColorPicker = 'crayon'
const DEFAULT_SELECTED_CRAYON: SelectedCrayon = 'full'
const DEFAULT_BOUNDARY: Boundary = 'on'
const DEFAULT_ANCHOR: Anchor = 'bottom'
const DEFAULT_CANVAS_BACKGROUND: CanvasBackground = 'white'
const DEFAULT_WIDTH_CONTROLS: WidthControls = 'off'
const DEFAULT_CONTROL_STYLE: ControlStyle = 'icon'
const DEFAULT_STROKE_WIDTH = 5
const DEFAULT_ERASER_SCALE = 1
const DEFAULT_DRAW_CURSOR = 'crosshair'
const DEFAULT_ERASE_CURSOR = 'cell'
const DEFAULT_SAVE_DOCUMENT: SaveDocument = 'off'
const MAX_INPUT_RECENT_COLORS = 5
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

const template = parseTemplateNode(templateHtml)
const crayonIcon = parseCrayonIcon(pencilSvg)
const eraserIcon = parseAssetIcon(eraserSvg, 'eraser.svg')
const eraserFilledIcon = parseAssetIcon(eraserFilledSvg, 'eraser-filled.svg')
const trashIcon = parseActionIcon(trashSvg, 'trash.svg')
const undoIcon = parseActionIcon(undoSvg, 'undo.svg')

class MagicCrayon extends HTMLElement {
  static observedAttributes = [
    'serialization',
    'color-picker',
    'selected-crayon',
    'boundary',
    'anchor',
    'canvas-background',
    'control-style',
    'draw-cursor',
    'erase-cursor',
    'save-document',
    'width-controls',
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
  protected readonly eraserButton: HTMLButtonElement
  protected readonly strokeWidthInput: HTMLInputElement
  protected readonly eraserScaleInput: HTMLInputElement

  protected context2d: Context2D | null = null
  protected resizeObserver: ResizeObserver | null = null
  protected teardown: Array<() => void> = []

  protected isDrawing = false
  protected activeMode: Mode | null = null
  protected selectedColor: string | null = null
  protected inputRecentColors: string[] = []
  protected inputRecentColorUsage = new Map<string, number>()
  protected inputRecentColorUsageTick = 0
  protected drawingValue: DrawingData | null = null
  protected serializationValue: Serialization = DEFAULT_SERIALIZATION
  protected colorPickerValue: ColorPicker = DEFAULT_COLOR_PICKER
  protected selectedCrayonValue: SelectedCrayon = DEFAULT_SELECTED_CRAYON
  protected boundaryValue: Boundary = DEFAULT_BOUNDARY
  protected anchorValue: Anchor = DEFAULT_ANCHOR
  protected canvasBackgroundValue: CanvasBackground = DEFAULT_CANVAS_BACKGROUND
  protected controlStyleValue: ControlStyle = DEFAULT_CONTROL_STYLE
  protected drawCursorValue: CursorStyle = DEFAULT_DRAW_CURSOR
  protected eraseCursorValue: CursorStyle = DEFAULT_ERASE_CURSOR
  protected saveDocumentValue: SaveDocument = DEFAULT_SAVE_DOCUMENT
  protected widthControlsValue: WidthControls = DEFAULT_WIDTH_CONTROLS
  protected strokeWidthValue: number = DEFAULT_STROKE_WIDTH
  protected eraserScaleValue: number = DEFAULT_ERASER_SCALE

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    const content = template.content.cloneNode(true)

    style.textContent = stylesCss

    if (!(content instanceof DocumentFragment)) {
      throw new Error('Expected template clone to be a DocumentFragment.')
    }

    content.prepend(style)
    this.root.appendChild(content)

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
    this.eraserButton = this.queryNode('[data-tool="eraser"]')
    this.strokeWidthInput = this.queryNode('[data-width-input="stroke"]')
    this.eraserScaleInput = this.queryNode('[data-width-input="eraser"]')

    this.syncControlUIState()
    this.renderColorButtons()
  }

  get serialization(): Serialization {
    return this.serializationValue
  }

  set serialization(value: Serialization) {
    const next = assertSerialization(value)

    this.serializationValue = next

    if (this.getAttribute('serialization') !== next) {
      this.setAttribute('serialization', next)
    }
  }

  get colorPicker(): ColorPicker {
    return this.colorPickerValue
  }

  set colorPicker(value: ColorPicker) {
    const next = assertColorPicker(value)

    this.colorPickerValue = next

    if (this.getAttribute('color-picker') !== next) {
      this.setAttribute('color-picker', next)
    }
  }

  get selectedCrayon(): SelectedCrayon {
    return this.selectedCrayonValue
  }

  set selectedCrayon(value: SelectedCrayon) {
    const next = assertSelectedCrayon(value)

    this.selectedCrayonValue = next
    this.colors.dataset.selectedCrayon = next

    if (this.getAttribute('selected-crayon') !== next) {
      this.setAttribute('selected-crayon', next)
    }
  }

  get boundary(): Boundary {
    return this.boundaryValue
  }

  set boundary(value: Boundary) {
    const next = assertBoundary(value)

    this.boundaryValue = next
    this.wrap.dataset.boundary = next

    if (this.getAttribute('boundary') !== next) {
      this.setAttribute('boundary', next)
    }
  }

  get anchor(): Anchor {
    return this.anchorValue
  }

  set anchor(value: Anchor) {
    const next = assertAnchor(value)

    this.anchorValue = next
    this.wrap.dataset.anchor = next

    if (this.getAttribute('anchor') !== next) {
      this.setAttribute('anchor', next)
    }
  }

  get canvasBackground(): CanvasBackground {
    return this.canvasBackgroundValue
  }

  set canvasBackground(value: CanvasBackground) {
    const next = assertCanvasBackground(value)

    this.applyCanvasBackground(next)

    if (this.getAttribute('canvas-background') !== next) {
      this.setAttribute('canvas-background', next)
    }
  }

  get controlStyle(): ControlStyle {
    return this.controlStyleValue
  }

  set controlStyle(value: ControlStyle) {
    const next = assertControlStyle(value)

    this.controlStyleValue = next
    this.syncControlButtonContent()

    if (this.getAttribute('control-style') !== next) {
      this.setAttribute('control-style', next)
    }
  }

  get drawCursor(): CursorStyle {
    return this.drawCursorValue
  }

  set drawCursor(value: CursorStyle) {
    const next = String(value)

    this.drawCursorValue = next
    this.syncCanvasCursor()

    if (this.getAttribute('draw-cursor') !== next) {
      this.setAttribute('draw-cursor', next)
    }
  }

  get eraseCursor(): CursorStyle {
    return this.eraseCursorValue
  }

  set eraseCursor(value: CursorStyle) {
    const next = String(value)

    this.eraseCursorValue = next
    this.syncCanvasCursor()

    if (this.getAttribute('erase-cursor') !== next) {
      this.setAttribute('erase-cursor', next)
    }
  }

  get strokeWidth(): number {
    return this.strokeWidthValue
  }

  set strokeWidth(value: number) {
    const next = assertStrokeWidth(value)

    this.strokeWidthValue = next
    this.syncLineWidthForActiveMode()
    this.syncWidthControlValues()

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
    this.syncWidthControlValues()

    if (this.getAttribute('eraser-scale') !== String(next)) {
      this.setAttribute('eraser-scale', String(next))
    }
  }

  get widthControls(): WidthControls {
    return this.widthControlsValue
  }

  set widthControls(value: WidthControls) {
    const next = assertWidthControls(value)

    this.widthControlsValue = next
    this.wrap.dataset.widthControls = next

    if (this.getAttribute('width-controls') !== next) {
      this.setAttribute('width-controls', next)
    }
  }

  get saveDocument(): SaveDocument {
    return this.saveDocumentValue
  }

  set saveDocument(value: SaveDocument) {
    const next = assertSaveDocument(value)

    this.saveDocumentValue = next

    if (this.getAttribute('save-document') !== next) {
      this.setAttribute('save-document', next)
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

    if (qualifiedName === 'anchor') {
      assertAnchor(value)
    }

    if (qualifiedName === 'canvas-background') {
      assertCanvasBackground(value)
    }

    if (qualifiedName === 'control-style') {
      assertControlStyle(value)
    }

    if (qualifiedName === 'save-document') {
      assertSaveDocument(value)
    }

    if (qualifiedName === 'width-controls') {
      assertWidthControls(value)
    }

    if (qualifiedName === 'stroke-width') {
      parseStrokeWidth(value)
    }

    if (qualifiedName === 'eraser-scale') {
      parseEraserScale(value)
    }

    super.setAttribute(qualifiedName, value)
  }

  get drawing(): DrawingData | null {
    return this.drawingValue
  }

  set drawing(value: DrawingData | null) {
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

    if (!this.hasAttribute('anchor')) {
      this.setAttribute('anchor', DEFAULT_ANCHOR)
    } else {
      this.anchorValue = assertAnchor(this.getAttribute('anchor'))
    }

    if (!this.hasAttribute('canvas-background')) {
      this.setAttribute('canvas-background', DEFAULT_CANVAS_BACKGROUND)
    } else {
      this.canvasBackgroundValue = assertCanvasBackground(
        this.getAttribute('canvas-background'),
      )
    }

    if (!this.hasAttribute('control-style')) {
      this.setAttribute('control-style', DEFAULT_CONTROL_STYLE)
    } else {
      this.controlStyleValue = assertControlStyle(this.getAttribute('control-style'))
    }

    if (!this.hasAttribute('draw-cursor')) {
      this.setAttribute('draw-cursor', DEFAULT_DRAW_CURSOR)
    } else {
      this.drawCursorValue = String(this.getAttribute('draw-cursor'))
    }

    if (!this.hasAttribute('erase-cursor')) {
      this.setAttribute('erase-cursor', DEFAULT_ERASE_CURSOR)
    } else {
      this.eraseCursorValue = String(this.getAttribute('erase-cursor'))
    }

    if (!this.hasAttribute('save-document')) {
      this.setAttribute('save-document', DEFAULT_SAVE_DOCUMENT)
    } else {
      this.saveDocumentValue = assertSaveDocument(this.getAttribute('save-document'))
    }

    if (!this.hasAttribute('width-controls')) {
      this.setAttribute('width-controls', DEFAULT_WIDTH_CONTROLS)
    } else {
      this.widthControlsValue = assertWidthControls(this.getAttribute('width-controls'))
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

    this.syncControlUIState()

    const context = this.canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context could not be created.')
    }

    this.context2d = new Context2D(context, {
      serialization: serializationToEnum[this.serializationValue],
      backgroundColor: this.getCanvasBackgroundColor(),
    })

    this.applyCanvasBackground(this.canvasBackgroundValue)

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
      if (newValue === 'crayon' || newValue === 'swatch' || newValue === 'input') {
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

    if (name === 'anchor') {
      this.anchorValue = newValue === null ? DEFAULT_ANCHOR : assertAnchor(newValue)
      this.wrap.dataset.anchor = this.anchorValue

      return
    }

    if (name === 'canvas-background') {
      this.applyCanvasBackground(
        newValue === null ? DEFAULT_CANVAS_BACKGROUND : assertCanvasBackground(newValue),
      )

      return
    }

    if (name === 'control-style') {
      this.controlStyleValue =
        newValue === 'text' || newValue === 'icon' ? newValue : DEFAULT_CONTROL_STYLE
      this.syncControlButtonContent()

      return
    }

    if (name === 'draw-cursor') {
      this.drawCursorValue = newValue ?? DEFAULT_DRAW_CURSOR
      this.syncCanvasCursor()

      return
    }

    if (name === 'erase-cursor') {
      this.eraseCursorValue = newValue ?? DEFAULT_ERASE_CURSOR
      this.syncCanvasCursor()

      return
    }

    if (name === 'save-document') {
      this.saveDocumentValue =
        newValue === null ? DEFAULT_SAVE_DOCUMENT : assertSaveDocument(newValue)

      return
    }

    if (name === 'width-controls') {
      if (newValue === 'on' || newValue === 'off') {
        this.widthControlsValue = newValue
        this.wrap.dataset.widthControls = this.widthControlsValue
      }

      return
    }

    if (name === 'stroke-width') {
      this.strokeWidthValue =
        newValue === null ? DEFAULT_STROKE_WIDTH : parseStrokeWidth(newValue)
      this.syncLineWidthForActiveMode()
      this.syncWidthControlValues()

      return
    }

    if (name === 'eraser-scale') {
      this.eraserScaleValue =
        newValue === null ? DEFAULT_ERASER_SCALE : parseEraserScale(newValue)
      this.syncLineWidthForActiveMode()
      this.syncWidthControlValues()

      return
    }
  }

  async getDrawingData(
    serialization: Serialization = this.serializationValue,
  ): Promise<DrawingData> {
    const mode = assertSerialization(serialization)
    const ctx = this.requireContext2D()

    return ctx.getData(serializationToEnum[mode])
  }

  async setDrawingData(data: DrawingData): Promise<void> {
    this.drawingValue = data

    if (this.context2d) {
      await this.context2d.setData(data)
    }
  }

  clearDrawingData(): void {
    this.drawingValue = null
    this.requireContext2D().clear()
  }

  applyCommand(command: MagicCrayonCommandV1): CommandExecutionResultV1 {
    const runtime = createContext2DCommandRuntime(this.requireContext2D())

    return executeCommandV1(runtime, command)
  }

  applyCommands(commands: MagicCrayonCommandV1[]): {
    version: 1
    results: CommandExecutionResultV1[]
  } {
    const runtime = createContext2DCommandRuntime(this.requireContext2D())

    return executeCommandBatchV1(runtime, commands)
  }

  getCommandState(): CommandApiStateV1 {
    const runtime = createContext2DCommandRuntime(this.requireContext2D())

    return getCommandApiStateV1(runtime)
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
    const paletteColors = COLORS.map(color => this.getPaletteColor(color))

    this.colors.dataset.picker = this.colorPickerValue
    this.colors.dataset.selectedCrayon = this.selectedCrayonValue

    if (this.colorPickerValue === 'input') {
      const input = document.createElement('input')
      const recentButtons = this.inputRecentColors.map(color => {
        const button = document.createElement('button')

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
        button.style.backgroundColor = color

        return button
      })

      input.type = 'color'
      input.className = 'color-input'
      input.setAttribute('data-color-input', 'true')
      input.setAttribute('aria-label', 'Pick color')
      input.value =
        this.selectedColor ??
        this.inputRecentColors.at(-1) ??
        this.getPaletteColor(COLORS[0])

      this.colors.replaceChildren(input, ...recentButtons)
      return
    }

    this.colors.replaceChildren(
      ...paletteColors.map(color => {
        const button = document.createElement('button')
        const icon = toSvgElement(crayonIcon.cloneNode(true))

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

  protected getCanvasBackgroundColor(): string {
    return this.canvasBackgroundValue === 'black' ? '#000000' : '#ffffff'
  }

  protected getPaletteColor(color: string): string {
    if (this.canvasBackgroundValue === 'black' && color === '#000000') {
      return '#ffffff'
    }

    return color
  }

  protected applyCanvasBackground(value: CanvasBackground): void {
    this.canvasBackgroundValue = value
    this.wrap.dataset.canvasBackground = value

    if (this.selectedColor === '#000000' && value === 'black') {
      this.selectedColor = '#ffffff'
    }

    if (this.selectedColor === '#ffffff' && value === 'white') {
      this.selectedColor = '#000000'
    }

    if (this.context2d) {
      this.context2d.canvasBackgroundColor = this.getCanvasBackgroundColor()
    }
    this.renderColorButtons()
    this.syncColorSelectionState()

    if (this.activeMode === Mode.DRAW && this.selectedColor && this.context2d) {
      this.context2d.strokeStyle = this.selectedColor
    }
  }

  protected pushInputRecentColor(color: string): boolean {
    this.inputRecentColorUsageTick += 1
    this.inputRecentColorUsage.set(color, this.inputRecentColorUsageTick)

    if (this.inputRecentColors.includes(color)) {
      return false
    }

    if (this.inputRecentColors.length < MAX_INPUT_RECENT_COLORS) {
      this.inputRecentColors = [...this.inputRecentColors, color]
      return true
    }

    const recentWithUsage = this.inputRecentColors.map(item => ({
      color: item,
      usage: this.inputRecentColorUsage.get(item) ?? 0,
    }))
    const leastRecent = recentWithUsage.reduce((prev, curr) =>
      curr.usage < prev.usage ? curr : prev,
    )
    const replaceIndex = this.inputRecentColors.findIndex(
      item => item === leastRecent.color,
    )

    if (replaceIndex < 0) {
      return false
    }

    const next = [...this.inputRecentColors]

    next[replaceIndex] = color
    this.inputRecentColors = next
    this.inputRecentColorUsage.delete(leastRecent.color)

    return true
  }

  protected bindUIEvents(): void {
    const onMenu = () => {
      this.setMenuOpen(this.wrap.dataset.menuOpen !== 'true')
    }

    const onTool = (event: Event) => {
      if (!isHTMLButtonElement(event.currentTarget)) {
        return
      }

      const target = event.currentTarget
      const tool = target.dataset.tool

      if (tool === 'eraser') {
        if (this.activeMode === Mode.ERASE) {
          this.setInactiveToolState()
          return
        }

        this.syncToolState(Mode.ERASE)
      }
    }

    const onColor = (event: Event) => {
      if (!isElement(event.target)) {
        return
      }

      const target = event.target
      const button = target.closest('.swatch')

      if (!(button instanceof HTMLButtonElement)) {
        return
      }

      const color = button?.dataset.color

      if (!color || !this.context2d) {
        return
      }

      if (this.selectedColor === color && this.activeMode === Mode.DRAW) {
        this.setInactiveToolState()
        return
      }

      this.selectedColor = color

      if (this.colorPickerValue === 'input') {
        this.renderColorButtons()
      }

      this.syncToolState(Mode.DRAW)
    }

    const onColorInput = (event: Event) => {
      if (!isHTMLInputElement(event.target)) {
        return
      }

      const target = event.target

      if (target.dataset.colorInput !== 'true' || !this.context2d) {
        return
      }

      this.selectedColor = target.value

      if (this.pushInputRecentColor(target.value)) {
        this.renderColorButtons()
      }

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
      const detail: SaveDetail = {
        data,
        serialization: this.serializationValue,
        meta: ctx.getMetaData(),
        timestamp: new Date().toISOString(),
      }

      if (this.saveDocumentValue === 'on') {
        detail.document = ctx.getDocument()
      }

      this.dispatchEvent(
        new CustomEvent<SaveDetail>('save', {
          bubbles: true,
          composed: true,
          detail,
        }),
      )
    }

    const onWidthInput = (event: Event) => {
      if (!isHTMLInputElement(event.currentTarget)) {
        return
      }

      const target = event.currentTarget
      const kind = target.dataset.widthInput

      if (kind !== 'stroke' && kind !== 'eraser') {
        return
      }

      const value = Number(target.value)

      if (kind === 'stroke') {
        this.strokeWidth = value
        this.dispatchWidthChange('stroke')
        return
      }

      this.eraserScale = value
      this.dispatchWidthChange('eraser')
    }

    this.menuButton.addEventListener('click', onMenu)
    this.eraserButton.addEventListener('click', onTool)
    this.undoButton.addEventListener('click', onUndo)
    this.redoButton.addEventListener('click', onRedo)
    this.clearButton.addEventListener('click', onClear)
    this.saveButton.addEventListener('click', onSave)
    this.strokeWidthInput.addEventListener('input', onWidthInput)
    this.eraserScaleInput.addEventListener('input', onWidthInput)

    this.colors.addEventListener('click', onColor)
    this.colors.addEventListener('input', onColorInput)

    this.teardown.push(() => this.menuButton.removeEventListener('click', onMenu))
    this.teardown.push(() => this.eraserButton.removeEventListener('click', onTool))
    this.teardown.push(() => this.undoButton.removeEventListener('click', onUndo))
    this.teardown.push(() => this.redoButton.removeEventListener('click', onRedo))
    this.teardown.push(() => this.clearButton.removeEventListener('click', onClear))
    this.teardown.push(() => this.saveButton.removeEventListener('click', onSave))
    this.teardown.push(() =>
      this.strokeWidthInput.removeEventListener('input', onWidthInput),
    )
    this.teardown.push(() =>
      this.eraserScaleInput.removeEventListener('input', onWidthInput),
    )
    this.teardown.push(() => this.colors.removeEventListener('click', onColor))
    this.teardown.push(() => this.colors.removeEventListener('input', onColorInput))
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
    this.eraserButton.setAttribute('aria-pressed', isDraw ? 'false' : 'true')
    this.syncControlButtonContent()

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
    this.eraserButton.setAttribute('aria-pressed', 'false')
    this.syncControlButtonContent()
    this.syncCanvasCursor()
    this.syncColorSelectionState()
  }

  protected syncCanvasCursor(): void {
    if (this.activeMode === Mode.DRAW) {
      this.canvas.style.cursor = this.drawCursorValue
      return
    }

    if (this.activeMode === Mode.ERASE) {
      this.canvas.style.cursor = this.eraseCursorValue
      return
    }

    this.canvas.style.cursor = 'default'
  }

  protected setButtonLabel(
    button: HTMLButtonElement,
    label: string,
    title: string,
    icon: SVGElement | null,
  ): void {
    button.textContent = ''
    button.setAttribute('title', title)

    if (this.controlStyleValue === 'icon' && icon) {
      const svg = toSvgElement(icon.cloneNode(true))

      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      button.append(svg)
      button.setAttribute('aria-label', label)
      button.classList.add('is-icon')
      return
    }

    button.textContent = label
    button.removeAttribute('aria-label')
    button.classList.remove('is-icon')
  }

  protected syncControlButtonContent(): void {
    const eraserIsPressed = this.eraserButton.getAttribute('aria-pressed') === 'true'

    this.setButtonLabel(
      this.eraserButton,
      'Eraser',
      'eraser',
      eraserIsPressed ? eraserFilledIcon : eraserIcon,
    )
    this.setButtonLabel(this.clearButton, 'Clear', 'trash', trashIcon)
    this.setButtonLabel(this.undoButton, 'Undo', 'undo', undoIcon)
    this.setButtonLabel(this.redoButton, 'Redo', 'redo', undoIcon)

    if (this.controlStyleValue === 'icon') {
      this.redoButton.classList.add('is-mirrored')
      return
    }

    this.redoButton.classList.remove('is-mirrored')
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

  protected syncWidthControlValues(): void {
    this.strokeWidthInput.value = String(this.strokeWidthValue)
    this.eraserScaleInput.value = String(this.eraserScaleValue)
  }

  protected syncControlUIState(): void {
    this.wrap.dataset.boundary = this.boundaryValue
    this.wrap.dataset.anchor = this.anchorValue
    this.wrap.dataset.canvasBackground = this.canvasBackgroundValue
    this.wrap.dataset.widthControls = this.widthControlsValue
    this.colors.dataset.selectedCrayon = this.selectedCrayonValue
    this.syncControlButtonContent()
    this.syncWidthControlValues()
  }

  protected dispatchWidthChange(source: 'stroke' | 'eraser'): void {
    this.dispatchEvent(
      new CustomEvent<WidthChangeDetail>('widthchange', {
        bubbles: true,
        composed: true,
        detail: {
          strokeWidth: this.strokeWidthValue,
          eraserScale: this.eraserScaleValue,
          eraserWidth: this.strokeWidthValue * this.eraserScaleValue,
          source,
        },
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MagicCrayon
  }

  interface GlobalEventHandlersEventMap {
    save: CustomEvent<SaveDetail>
    undoavailabilitychange: CustomEvent<AvailabilityDetail>
    redoavailabilitychange: CustomEvent<AvailabilityDetail>
    widthchange: CustomEvent<WidthChangeDetail>
  }
}

export { MagicCrayon, TAG_NAME }
export type {
  Anchor,
  AvailabilityDetail,
  Boundary,
  CanvasBackground,
  ColorPicker,
  ControlStyle,
  CursorStyle,
  DrawingData,
  SaveDetail,
  SaveDocument,
  SelectedCrayon,
  Serialization,
  WidthControls,
  WidthChangeDetail,
}
