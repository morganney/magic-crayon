import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const cleanCss = new CleanCSS({
  level: 2,
})

const isRawImport = (id: string): boolean => {
  const query = id.split('?', 2)[1]

  if (!query) {
    return false
  }

  return new URLSearchParams(query).has('raw')
}

const minifyRawSource = async (source: string, extension: string): Promise<string> => {
  if (extension === '.css') {
    const result = cleanCss.minify(source)

    if (result.errors.length > 0) {
      throw new Error(`Failed to minify CSS raw import: ${result.errors.join('; ')}`)
    }

    return result.styles.trim()
  }

  if (extension === '.html') {
    return minifyHtml(source, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
    })
  }

  if (extension === '.svg') {
    return minifyHtml(source, {
      caseSensitive: true,
      collapseWhitespace: true,
      removeComments: true,
      removeAttributeQuotes: false,
      keepClosingSlash: true,
    })
  }

  return source
}

const minifyRawInlineAssets = () => ({
  name: 'minify-raw-inline-assets',
  apply: 'build' as const,
  enforce: 'pre' as const,
  async load(id: string) {
    if (!isRawImport(id)) {
      return null
    }

    const filePath = id.split('?', 2)[0]
    const source = await readFile(filePath, 'utf8')
    const minified = await minifyRawSource(source, extname(filePath).toLowerCase())

    return `export default ${JSON.stringify(minified)}`
  },
})

const emitPreviewFixture = (): Plugin => ({
  name: 'emit-preview-fixture',
  apply: 'build' as const,
  async generateBundle() {
    const fixture = await readFile('index.html', 'utf8')

    this.emitFile({
      type: 'asset',
      fileName: 'index.html',
      source: fixture,
    })
  },
})

export default defineConfig({
  plugins: [minifyRawInlineAssets(), emitPreviewFixture()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        'magic-crayon': 'src/magic-crayon.ts',
        defined: 'src/defined.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
  },
})
