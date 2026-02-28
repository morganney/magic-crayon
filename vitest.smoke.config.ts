import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

const browser =
  process.env.SMOKE_BROWSER === 'firefox' ||
  process.env.SMOKE_BROWSER === 'webkit' ||
  process.env.SMOKE_BROWSER === 'chromium'
    ? process.env.SMOKE_BROWSER
    : 'chromium'

export default defineConfig({
  test: {
    include: ['test/smoke/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser }],
    },
  },
})
