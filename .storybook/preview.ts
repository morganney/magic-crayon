import type { Preview } from '@storybook/web-components-vite'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
      },
    },
  },
}

export default preview
