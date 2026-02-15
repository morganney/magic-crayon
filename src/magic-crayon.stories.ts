import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { fn } from 'storybook/test'

import './defined.js'

type StoryArgs = {
  serialization: 'blob' | 'dataurl'
  colorPicker: 'crayon' | 'swatch'
  hostHeight: number
  onSave: (detail: unknown) => void
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
    hostHeight: 640,
    onSave: fn(),
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
  },
  render: ({ serialization, colorPicker, hostHeight, onSave }) => {
    const host = document.createElement('div')
    const element = document.createElement('magic-crayon')

    host.style.height = `${hostHeight}px`
    host.style.width = '100%'
    host.style.boxSizing = 'border-box'
    host.style.padding = '12px'

    element.setAttribute('serialization', serialization)
    element.setAttribute('color-picker', colorPicker)
    element.addEventListener('save', event => {
      const customEvent = event as CustomEvent

      onSave(customEvent.detail)
    })
    host.append(element)

    return host
  },
}

export default meta

type Story = StoryObj<StoryArgs>

export const Playground: Story = {}
