import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { fn } from 'storybook/test'

import { MagicCrayon, TAG_NAME } from './magic-crayon.js'
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
    boundary: 'on',
    canvasBackground: 'white',
    controlStyle: 'icon',
    drawCursor: 'crosshair',
    eraseCursor: 'cell',
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
    boundary,
    canvasBackground,
    controlStyle,
    drawCursor,
    eraseCursor,
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
    element.setAttribute('boundary', boundary)
    element.setAttribute('canvas-background', canvasBackground)
    element.setAttribute('control-style', controlStyle)
    element.setAttribute('draw-cursor', drawCursor)
    element.setAttribute('erase-cursor', eraseCursor)
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
