import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import config from '../next.config.mjs'

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(filename)
    return /\.[jt]sx$/.test(entry.name) ? [filename] : []
  }))
  return nested.flat()
}

test('the image optimizer permits each explicitly requested component quality', async () => {
  const allowed = new Set(config.images.qualities)
  assert.ok(allowed.has(75), 'the default quality must remain available')
  const files = (await Promise.all(['app', 'components'].map(sourceFiles))).flat()
  for (const filename of files) {
    const source = await readFile(filename, 'utf8')
    for (const match of source.matchAll(/\bquality\s*=\s*\{\s*(\d+)\s*\}/g)) {
      assert.ok(allowed.has(Number(match[1])), `${filename}: quality ${match[1]} is not allowed`)
    }
  }
})
