import { Composites, Context2D, Mode, Serializations } from './context2d.js'
import type { Context2DMetaData, CustomNumberEventListener } from './context2d.js'
import pencilSvg from '../assets/source/pencil.svg?raw'

type MagicCrayonSerialization = 'blob' | 'dataurl'
type MagicCrayonColorPicker = 'crayon' | 'swatch'
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

const template = document.createElement('template')
const crayonIconTemplate = document.createElement('template')

crayonIconTemplate.innerHTML = pencilSvg

template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      contain: content;
      container-type: inline-size;
      container-name: magic-crayon;
    }

    .wrap {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 100%;
      overflow: hidden;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0;
    }

    .canvas-stage {
      position: relative;
      min-height: 0;
      display: grid;
      align-items: center;
      justify-items: stretch;
      background: #f2f2f2;
    }

    .canvas-wrap {
      width: 100%;
      aspect-ratio: 16 / 9;
      max-height: var(--canvas-max-height, none);
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      touch-action: none;
      cursor: crosshair;
      background-color: #ffffff;
    }

    .controls {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 8px 16px;
      min-width: 0;
      background-color: #f7f7f7;
    }

    .panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-width: 0;
      flex: 1;
    }

    .left,
    .actions,
    .colors {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .menu-toggle {
      display: none;
    }

    .ratio-note {
      display: none;
      margin: 0;
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      text-align: center;
      color: #666666;
      font-size: 12px;
      line-height: 1.3;
      pointer-events: none;
    }

    button {
      border-width: 2px;
      border-style: solid;
      border-radius: 999px;
      font-weight: 700;
      cursor: pointer;
      background-color: #1da7e1;
      border-color: #1da7e1;
      color: #ffffff;
      padding: 6px 14px;
      font-size: 14px;
      line-height: 1;
    }

    button:disabled {
      cursor: not-allowed;
      background-color: #9b9b9b;
      border-color: #9b9b9b;
    }

    .tool[aria-pressed='true'] {
      background-color: #000000;
      border-color: #000000;
    }

    .menu-toggle[aria-expanded='true'] {
      background-color: #000000;
      border-color: #000000;
    }

    .swatch {
      cursor: pointer;
      color: inherit;
      flex: 0 0 auto;
    }

    .tool,
    .actions > button {
      flex: 0 0 auto;
    }

    .colors[data-picker='crayon'] .swatch {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: 16px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      transform-origin: bottom center;
      transition: transform 0.15s ease;
    }

    .colors[data-picker='crayon'] .swatch > svg {
      width: 16px;
      height: auto;
      display: block;
    }

    .colors[data-picker='crayon'] .swatch[aria-pressed='true'] {
      transform: translateY(-8px);
    }

    .colors[data-picker='swatch'] .swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #dddddd;
      padding: 0;
      background: transparent;
    }

    .colors[data-picker='swatch'] .swatch[aria-pressed='true'] {
      border-color: #0b63ce;
      box-shadow: inset 0 0 0 2px #0b63ce;
    }

    .clear {
      color: #d7282f;
      border-color: #d7282f;
      background-color: #ffffff;
    }

    @container magic-crayon (max-width: 768px) {
      .wrap {
        grid-template-rows: auto auto;
        overflow-x: hidden;
        overflow-y: visible;
      }

      .controls {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-areas: 'menu save';
        align-items: center;
        align-content: start;
        column-gap: 8px;
        row-gap: 0;
        padding: 8px;
        height: auto;
      }

      .wrap[data-menu-open='true'] .controls {
        grid-template-areas:
          'menu save'
          'panel panel';
        row-gap: 8px;
      }

      .menu-toggle {
        display: inline-flex;
        grid-area: menu;
        justify-self: start;
      }

      .save {
        grid-area: save;
        justify-self: end;
      }

      .panel {
        grid-area: panel;
        display: none;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        border: 1px solid #dddddd;
        border-radius: 12px;
        padding: 8px;
        background-color: #ffffff;
      }

      .ratio-note {
        display: block;
      }

      .wrap[data-menu-open='true'] .panel {
        display: flex;
      }

      .left {
        flex-wrap: nowrap;
      }

      .colors {
        overflow-x: auto;
        overflow-y: hidden;
        flex-wrap: nowrap;
        white-space: nowrap;
        padding-bottom: 2px;
      }

      .actions {
        flex-wrap: wrap;
      }

      .actions > button {
        flex: 1 1 calc(33.333% - 6px);
        min-width: 84px;
      }
    }
  </style>
  <div class="wrap">
    <div class="canvas-stage">
      <p class="ratio-note" aria-live="polite">
        Drawing area uses a fixed 16:9 aspect ratio for consistent cross-device output.
      </p>
      <div class="canvas-wrap">
        <canvas part="canvas"></canvas>
      </div>
    </div>
    <div class="controls" part="controls">
      <button type="button" class="menu-toggle" data-action="menu" aria-expanded="false">Tools</button>
      <div class="panel">
        <div class="left">
          <button type="button" class="tool" data-tool="pencil" aria-pressed="false">Pencil</button>
          <button type="button" class="tool" data-tool="eraser" aria-pressed="false">Eraser</button>
          <div class="colors" role="group" aria-label="Pencil colors"></div>
        </div>
        <div class="actions">
          <button type="button" class="clear" data-action="clear">Clear</button>
          <button type="button" data-action="undo" disabled>Undo</button>
          <button type="button" data-action="redo" disabled>Redo</button>
        </div>
      </div>
      <button type="button" class="save" data-action="save">Save</button>
    </div>
  </div>
`

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

class MagicCrayon extends HTMLElement {
  static observedAttributes = ['serialization', 'color-picker']

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

  setAttribute(qualifiedName: string, value: string): void {
    if (qualifiedName === 'serialization') {
      assertSerialization(value)
    }

    if (qualifiedName === 'color-picker') {
      assertColorPicker(value)
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

    this.colors.replaceChildren(
      ...COLORS.map(color => {
        const button = document.createElement('button')
        const icon = crayonIconTemplate.content.firstElementChild?.cloneNode(
          true,
        ) as SVGElement | null

        button.type = 'button'
        button.className = 'swatch'
        button.setAttribute('data-color', color)
        button.setAttribute('aria-label', `Color ${color}`)
        button.setAttribute(
          'aria-pressed',
          this.selectedColor === color ? 'true' : 'false',
        )
        button.style.color = color

        if (this.colorPickerValue === 'swatch') {
          button.style.backgroundColor = color
          return button
        }

        if (icon) {
          icon.setAttribute('aria-hidden', 'true')
          icon.setAttribute('focusable', 'false')
          button.append(icon)
        }

        return button
      }),
    )
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

        for (const item of this.colors.querySelectorAll<HTMLButtonElement>('.swatch')) {
          item.setAttribute('aria-pressed', 'false')
        }

        return
      }

      this.selectedColor = color

      this.syncToolState(Mode.DRAW)
      this.context2d.strokeStyle = color

      for (const item of this.colors.querySelectorAll<HTMLButtonElement>('.swatch')) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false')
      }
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
      const active = this.selectedColor

      ctx.pencilMode = Mode.DRAW
      ctx.compositing = Composites.DRAW
      ctx.lineWidth = 5

      if (active) {
        ctx.strokeStyle = active
      }
    } else {
      ctx.pencilMode = Mode.ERASE
      ctx.compositing = Composites.ERASE
      ctx.lineWidth = 20
    }
  }

  protected setInactiveToolState(): void {
    this.activeMode = null
    this.pencilButton.setAttribute('aria-pressed', 'false')
    this.eraserButton.setAttribute('aria-pressed', 'false')
  }

  protected setMenuOpen(open: boolean): void {
    this.wrap.dataset.menuOpen = open ? 'true' : 'false'
    this.menuButton.setAttribute('aria-expanded', open ? 'true' : 'false')
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
  MagicCrayonColorPicker,
  MagicCrayonDrawingData,
  MagicCrayonSaveDetail,
  MagicCrayonSerialization,
}
