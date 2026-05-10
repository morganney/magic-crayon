import { describe, expect, it } from 'vitest'

import {
  asRecord,
  asString,
  parseCommandEnvelope,
  parseCommandFromKindAndPayload,
  parseCommandList,
} from '../../src/adapters/command-mapper.js'

describe('command mapper helpers', () => {
  it('asRecord returns null for non-record values', () => {
    expect(asRecord(null)).toBeNull()
    expect(asRecord(1)).toBeNull()
    expect(asRecord(['x'])).toBeNull()
  })

  it('asRecord returns the input for plain objects', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 })
  })

  it('asString accepts non-empty strings only', () => {
    expect(asString('draw-path')).toBe('draw-path')
    expect(asString('')).toBeNull()
    expect(asString(42)).toBeNull()
  })

  it('parseCommandFromKindAndPayload parses normalized kinds', () => {
    const command = parseCommandFromKindAndPayload('  DRAW_PATH  ', {
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: {
        strokeWidth: 2,
      },
    })

    expect(command).toEqual({
      kind: 'draw-path',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      style: {
        strokeWidth: 2,
      },
    })
  })

  it('parseCommandFromKindAndPayload returns null for unsupported kind', () => {
    const command = parseCommandFromKindAndPayload('download', {
      document: { version: 1, strokes: [] },
    })

    expect(command).toBeNull()
  })

  it('parseCommandFromKindAndPayload returns null for invalid payload', () => {
    const command = parseCommandFromKindAndPayload('draw-circle', {
      center: { x: 10, y: 10 },
      radius: -1,
      style: { strokeWidth: 2 },
    })

    expect(command).toBeNull()
  })

  it('parseCommandFromKindAndPayload supports replace-document', () => {
    const command = parseCommandFromKindAndPayload('replace_document', {
      document: {
        version: 1,
        strokes: [
          {
            mode: 'draw',
            strokeStyle: '#000000',
            lineCap: 'round',
            lineJoin: 'round',
            lineWidth: 5,
            compositing: 'source-over',
            sourceWidth: 100,
            sourceHeight: 100,
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
          },
        ],
      },
    })

    expect(command).toEqual({
      kind: 'replace-document',
      document: {
        version: 1,
        strokes: [
          {
            mode: 'draw',
            strokeStyle: '#000000',
            lineCap: 'round',
            lineJoin: 'round',
            lineWidth: 5,
            compositing: 'source-over',
            sourceWidth: 100,
            sourceHeight: 100,
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
          },
        ],
      },
    })
  })

  it('parseCommandEnvelope parses valid command objects', () => {
    const command = parseCommandEnvelope({ kind: 'clear' })

    expect(command).toEqual({ kind: 'clear' })
  })

  it('parseCommandEnvelope returns null for invalid command objects', () => {
    const command = parseCommandEnvelope({ kind: 'erase-path' })

    expect(command).toBeNull()
  })

  it('parseCommandList parses valid command arrays', () => {
    const commands = parseCommandList([{ kind: 'undo' }, { kind: 'redo' }])

    expect(commands).toEqual([{ kind: 'undo' }, { kind: 'redo' }])
  })

  it('parseCommandList returns null for invalid command arrays', () => {
    expect(parseCommandList([])).toBeNull()
    expect(parseCommandList([{ kind: 'redo' }, { kind: 'bad' }])).toBeNull()
  })
})
