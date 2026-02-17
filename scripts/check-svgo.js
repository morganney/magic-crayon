import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'
import { optimize } from 'svgo'

import svgoConfig from '../svgo.config.js'

const root = process.cwd()
const assetsDirectory = join(root, 'assets')

const findSvgFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findSvgFiles(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.svg')) {
      files.push(fullPath)
    }
  }

  return files
}

const svgFiles = await findSvgFiles(assetsDirectory)
const changedFiles = []

for (const filePath of svgFiles) {
  const source = await readFile(filePath, 'utf8')
  const result = optimize(source, {
    ...svgoConfig,
    path: filePath,
  })

  if ('data' in result && result.data !== source) {
    changedFiles.push(relative(root, filePath))
  }
}

if (changedFiles.length === 0) {
  process.stdout.write('All SVG assets are already optimized.\n')
  process.exit(0)
}

process.stderr.write('The following SVG files are not optimized:\n')

for (const file of changedFiles) {
  process.stderr.write(`- ${file}\n`)
}

process.stderr.write('\nRun `npm run svg:optimize` and commit the updated files.\n')
process.exit(1)
