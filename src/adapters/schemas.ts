import { z } from 'zod'

import type { MagicCrayonCommandV1 } from '../command-api.js'

const normalizedValueSchema = z.number().finite().min(0).max(100)

const pointSchema = z.object({
  x: normalizedValueSchema,
  y: normalizedValueSchema,
})

const styleSchema = z.object({
  strokeWidth: z.number().finite().positive(),
  lineCap: z.enum(['butt', 'round', 'square']).optional(),
  lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
  color: z.string().min(1).optional(),
})

const drawPathCommandSchema = z.object({
  kind: z.literal('draw-path'),
  points: z.array(pointSchema).min(2),
  style: styleSchema,
})

const erasePathCommandSchema = z.object({
  kind: z.literal('erase-path'),
  points: z.array(pointSchema).min(2),
  style: styleSchema.omit({ color: true }),
})

const drawCircleCommandSchema = z.object({
  kind: z.literal('draw-circle'),
  center: pointSchema,
  radius: z.number().finite().positive().max(100),
  style: styleSchema,
})

const eraseRectCommandSchema = z.object({
  kind: z.literal('erase-rect'),
  rect: z.object({
    x: normalizedValueSchema,
    y: normalizedValueSchema,
    width: normalizedValueSchema,
    height: normalizedValueSchema,
  }),
})

const globalCompositeOperationSchema = z.enum([
  'source-over',
  'source-in',
  'source-out',
  'source-atop',
  'destination-over',
  'destination-in',
  'destination-out',
  'destination-atop',
  'lighter',
  'copy',
  'xor',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
])

const strokePointSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
})

const replaceDocumentCommandSchema = z.object({
  kind: z.literal('replace-document'),
  document: z.object({
    version: z.literal(1),
    strokes: z.array(
      z.object({
        mode: z.enum(['draw', 'erase']),
        strokeStyle: z.string().min(1),
        lineCap: z.enum(['butt', 'round', 'square']),
        lineJoin: z.enum(['bevel', 'round', 'miter']),
        lineWidth: z.number().finite().positive(),
        compositing: globalCompositeOperationSchema,
        sourceWidth: z.number().finite().positive(),
        sourceHeight: z.number().finite().positive(),
        points: z.array(strokePointSchema).min(1),
      }),
    ),
  }),
})

const clearCommandSchema = z.object({
  kind: z.literal('clear'),
})

const undoCommandSchema = z.object({
  kind: z.literal('undo'),
})

const redoCommandSchema = z.object({
  kind: z.literal('redo'),
})

const commandSchema = z.discriminatedUnion('kind', [
  drawPathCommandSchema,
  erasePathCommandSchema,
  drawCircleCommandSchema,
  eraseRectCommandSchema,
  replaceDocumentCommandSchema,
  clearCommandSchema,
  undoCommandSchema,
  redoCommandSchema,
])

const commandListSchema = z.array(commandSchema).min(1)

type CommandInput = z.infer<typeof commandSchema>

const toCommand = (input: CommandInput): MagicCrayonCommandV1 => {
  return input
}

export {
  commandListSchema,
  commandSchema,
  drawCircleCommandSchema,
  drawPathCommandSchema,
  erasePathCommandSchema,
  eraseRectCommandSchema,
  replaceDocumentCommandSchema,
  styleSchema,
}
export { toCommand }
