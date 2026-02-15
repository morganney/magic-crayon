import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../src/**/*.stories.@(ts|tsx|js|jsx)'],
  addons: [],
}

export default config
