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
  styleSchema,
}
export { toCommand }
