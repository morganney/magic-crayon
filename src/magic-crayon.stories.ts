import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { fn } from 'storybook/test'

import './defined.js'

type StoryArgs = {
  serialization: 'blob' | 'dataurl'
  colorPicker: 'crayon' | 'swatch'
  selectedCrayon: 'full' | 'clipped'
  boundary: 'on' | 'off'
  widthControls: 'on' | 'off'
  strokeWidth: number
  eraserScale: number
  hostHeight: number
  onSave: (detail: unknown) => void
  onWidthChange: (detail: unknown) => void
}

const meta: Meta<StoryArgs> = {
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
      options: ['blob', 'dataurl'],
    },
    colorPicker: {
      name: 'color-picker',
      description: 'Choose the color selection experience.',
      control: { type: 'inline-radio' },
      options: ['crayon', 'swatch'],
    },
    selectedCrayon: {
      name: 'selected-crayon',
      description: 'Control selected crayon visibility in crayon picker mode.',
      control: { type: 'inline-radio' },
      options: ['full', 'clipped'],
    },
    boundary: {
      name: 'boundary',
      description: 'Toggle the default outer visual boundary cue.',
      control: { type: 'inline-radio' },
      options: ['on', 'off'],
    },
    widthControls: {
      name: 'width-controls',
      description: 'Toggle the built-in width sliders visibility.',
      control: { type: 'inline-radio' },
      options: ['on', 'off'],
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
}

export default meta

type Story = StoryObj<StoryArgs>

export const Playground: Story = {}
