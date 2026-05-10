import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { fn } from 'storybook/test'

import { MagicCrayon, TAG_NAME } from './magic-crayon.js'
import type { DrawingDocumentV1 } from './context2d-document.js'
import type { SaveDetail, WidthChangeDetail } from './types.js'

type StoryArgs = MagicCrayon & {
  hostHeight: number
  onSave: (detail: SaveDetail) => void
  onWidthChange: (detail: WidthChangeDetail) => void
}

const serializationOptions = ['blob', 'dataurl'] as const satisfies readonly NonNullable<
  StoryArgs['serialization']
>[]
const colorPickerOptions = [
  'crayon',
  'swatch',
  'input',
] as const satisfies readonly NonNullable<StoryArgs['colorPicker']>[]
const selectedCrayonOptions = ['full', 'clipped'] as const satisfies readonly NonNullable<
  StoryArgs['selectedCrayon']
>[]
const anchorOptions = ['top', 'center', 'bottom'] as const satisfies readonly NonNullable<
  StoryArgs['anchor']
>[]
const boundaryOptions = ['on', 'off'] as const satisfies readonly NonNullable<
  StoryArgs['boundary']
>[]
const canvasBackgroundOptions = [
  'white',
  'black',
] as const satisfies readonly NonNullable<StoryArgs['canvasBackground']>[]
const controlStyleOptions = ['text', 'icon'] as const satisfies readonly NonNullable<
  StoryArgs['controlStyle']
>[]
const saveDocumentOptions = ['on', 'off'] as const satisfies readonly NonNullable<
  StoryArgs['saveDocument']
>[]
const widthControlsOptions = ['on', 'off'] as const satisfies readonly NonNullable<
  StoryArgs['widthControls']
>[]

const meta = {
  title: 'Magic Crayon/Element',
  parameters: {
    docs: {
      description: {
        component:
          'Interactive custom element story for configuring `<magic-crayon>` attributes.',
      },
    },
  },
  args: {
    serialization: 'blob',
    colorPicker: 'crayon',
    selectedCrayon: 'full',
    anchor: 'bottom',
    boundary: 'on',
    canvasBackground: 'white',
    controlStyle: 'icon',
    drawCursor: 'crosshair',
    eraseCursor: 'cell',
    saveDocument: 'off',
    widthControls: 'off',
    strokeWidth: 5,
    eraserScale: 1,
    hostHeight: 640,
    onSave: fn(),
    onWidthChange: fn(),
  },
  argTypes: {
    serialization: {
      control: { type: 'inline-radio' },
      options: serializationOptions,
    },
    colorPicker: {
      name: 'color-picker',
      description: 'Choose the color selection experience.',
      control: { type: 'inline-radio' },
      options: colorPickerOptions,
    },
    selectedCrayon: {
      name: 'selected-crayon',
      description: 'Control selected crayon visibility in crayon picker mode.',
      control: { type: 'inline-radio' },
      options: selectedCrayonOptions,
    },
    anchor: {
      name: 'anchor',
      description: 'Anchor the component vertically within its host area.',
      control: { type: 'inline-radio' },
      options: anchorOptions,
    },
    boundary: {
      name: 'boundary',
      description: 'Toggle the default outer visual boundary cue.',
      control: { type: 'inline-radio' },
      options: boundaryOptions,
    },
    canvasBackground: {
      name: 'canvas-background',
      description: 'Set canvas background color mode.',
      control: { type: 'inline-radio' },
      options: canvasBackgroundOptions,
    },
    controlStyle: {
      name: 'control-style',
      description: 'Switch between text labels and icon controls for clear/undo/redo.',
      control: { type: 'inline-radio' },
      options: controlStyleOptions,
    },
    drawCursor: {
      name: 'draw-cursor',
      description: 'CSS cursor value used while in draw mode.',
      control: { type: 'text' },
    },
    eraseCursor: {
      name: 'erase-cursor',
      description: 'CSS cursor value used while in erase mode.',
      control: { type: 'text' },
    },
    saveDocument: {
      name: 'save-document',
      description: 'Include command document in save event payload.',
      control: { type: 'inline-radio' },
      options: saveDocumentOptions,
    },
    widthControls: {
      name: 'width-controls',
      description: 'Toggle the built-in width sliders visibility.',
      control: { type: 'inline-radio' },
      options: widthControlsOptions,
    },
    strokeWidth: {
      name: 'stroke-width',
      description: 'Base line width used for drawing.',
      control: { type: 'range', min: 1, max: 48, step: 1 },
    },
    eraserScale: {
      name: 'eraser-scale',
      description: 'Eraser width multiplier applied to stroke width.',
      control: { type: 'range', min: 1, max: 6, step: 0.1 },
    },
    hostHeight: {
      control: { type: 'range', min: 360, max: 1000, step: 10 },
    },
    onSave: {
      name: 'save',
      action: 'save',
      table: {
        category: 'events',
      },
    },
    onWidthChange: {
      name: 'widthchange',
      action: 'widthchange',
      table: {
        category: 'events',
      },
    },
  },
  render: ({
    serialization,
    colorPicker,
    selectedCrayon,
    anchor,
    boundary,
    canvasBackground,
    controlStyle,
    drawCursor,
    eraseCursor,
    saveDocument,
    widthControls,
    strokeWidth,
    eraserScale,
    hostHeight,
    onSave,
    onWidthChange,
  }) => {
    const host = document.createElement('div')
    const element = document.createElement('magic-crayon')

    host.style.height = `${hostHeight}px`
    host.style.width = '100%'
    host.style.boxSizing = 'border-box'
    host.style.margin = '0'
    host.style.padding = '0'

    element.setAttribute('serialization', serialization)
    element.setAttribute('color-picker', colorPicker)
    element.setAttribute('selected-crayon', selectedCrayon)
    element.setAttribute('anchor', anchor)
    element.setAttribute('boundary', boundary)
    element.setAttribute('canvas-background', canvasBackground)
    element.setAttribute('control-style', controlStyle)
    element.setAttribute('draw-cursor', drawCursor)
    element.setAttribute('erase-cursor', eraseCursor)
    element.setAttribute('save-document', saveDocument)
    element.setAttribute('width-controls', widthControls)
    element.setAttribute('stroke-width', String(strokeWidth))
    element.setAttribute('eraser-scale', String(eraserScale))
    element.addEventListener('save', event => {
      const customEvent = event as CustomEvent

      onSave(customEvent.detail)
    })
    element.addEventListener('widthchange', event => {
      const customEvent = event as CustomEvent

      onWidthChange(customEvent.detail)
    })
    host.append(element)

    return host
  },
} satisfies Meta<StoryArgs>

customElements.define(TAG_NAME, MagicCrayon)

export default meta

type Story = StoryObj<StoryArgs>

export const Playground: Story = {}

const importUndoRedoDocument = (): DrawingDocumentV1 => {
  return {
    version: 1,
    strokes: [
      {
        mode: 'draw',
        strokeStyle: '#e11d48',
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 5,
        compositing: 'source-over',
        sourceWidth: 100,
        sourceHeight: 100,
        points: [
          { x: 12, y: 20 },
          { x: 36, y: 30 },
        ],
      },
      {
        mode: 'draw',
        strokeStyle: '#0ea5e9',
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 5,
        compositing: 'source-over',
        sourceWidth: 100,
        sourceHeight: 100,
        points: [
          { x: 28, y: 58 },
          { x: 62, y: 66 },
        ],
      },
      {
        mode: 'draw',
        strokeStyle: '#16a34a',
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 5,
        compositing: 'source-over',
        sourceWidth: 100,
        sourceHeight: 100,
        points: [
          { x: 56, y: 18 },
          { x: 88, y: 36 },
        ],
      },
    ],
  }
}

export const ImportUndoRedo: Story = {
  name: 'Import -> Undo -> Redo',
  parameters: {
    docs: {
      description: {
        story:
          'Use the buttons to import a fixed document, then undo and redo the newest stroke. This specifically exercises setDocument history ordering.',
      },
    },
  },
  render: ({
    serialization,
    colorPicker,
    selectedCrayon,
    anchor,
    boundary,
    canvasBackground,
    controlStyle,
    drawCursor,
    eraseCursor,
    saveDocument,
    widthControls,
    strokeWidth,
    eraserScale,
    hostHeight,
    onSave,
    onWidthChange,
  }) => {
    const root = document.createElement('div')
    const host = document.createElement('div')
    const controls = document.createElement('div')
    const status = document.createElement('pre')
    const importButton = document.createElement('button')
    const undoButton = document.createElement('button')
    const redoButton = document.createElement('button')
    const element = document.createElement('magic-crayon')

    root.style.display = 'grid'
    root.style.gap = '12px'
    host.style.height = `${hostHeight}px`
    host.style.width = '100%'
    host.style.boxSizing = 'border-box'
    host.style.margin = '0'
    host.style.padding = '0'

    controls.style.display = 'flex'
    controls.style.gap = '8px'
    controls.style.flexWrap = 'wrap'

    status.style.margin = '0'
    status.style.padding = '8px'
    status.style.fontSize = '12px'
    status.style.lineHeight = '1.4'
    status.style.background = '#f6f8fa'
    status.style.border = '1px solid #d0d7de'

    importButton.type = 'button'
    importButton.textContent = 'Import sample document'
    undoButton.type = 'button'
    undoButton.textContent = 'Undo'
    redoButton.type = 'button'
    redoButton.textContent = 'Redo'

    const updateStatus = () => {
      const commandState = element.getCommandState()
      const strokeStarts = commandState.document.strokes
        .map(stroke => stroke.points[0]?.x)
        .filter((value): value is number => typeof value === 'number')

      status.textContent = JSON.stringify(
        {
          strokes: commandState.document.strokes.length,
          undoSize: commandState.undoSize,
          redoSize: commandState.redoSize,
          firstPointXs: strokeStarts,
        },
        null,
        2,
      )
    }

    element.setAttribute('serialization', serialization)
    element.setAttribute('color-picker', colorPicker)
    element.setAttribute('selected-crayon', selectedCrayon)
    element.setAttribute('anchor', anchor)
    element.setAttribute('boundary', boundary)
    element.setAttribute('canvas-background', canvasBackground)
    element.setAttribute('control-style', controlStyle)
    element.setAttribute('draw-cursor', drawCursor)
    element.setAttribute('erase-cursor', eraseCursor)
    element.setAttribute('save-document', saveDocument)
    element.setAttribute('width-controls', widthControls)
    element.setAttribute('stroke-width', String(strokeWidth))
    element.setAttribute('eraser-scale', String(eraserScale))
    element.addEventListener('save', event => {
      const customEvent = event as CustomEvent

      onSave(customEvent.detail)
    })
    element.addEventListener('widthchange', event => {
      const customEvent = event as CustomEvent

      onWidthChange(customEvent.detail)
    })
    importButton.addEventListener('click', () => {
      element.applyCommand({
        kind: 'replace-document',
        document: importUndoRedoDocument(),
      })
      updateStatus()
    })
    undoButton.addEventListener('click', () => {
      element.applyCommand({ kind: 'undo' })
      updateStatus()
    })
    redoButton.addEventListener('click', () => {
      element.applyCommand({ kind: 'redo' })
      updateStatus()
    })

    controls.append(importButton, undoButton, redoButton)
    host.append(element)
    root.append(host, controls, status)
    queueMicrotask(updateStatus)

    return root
  },
}
