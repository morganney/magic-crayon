import { z } from 'zod'

import { commandListSchema, commandSchema } from '../../schemas.js'

const drawPathToolSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const erasePathToolSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
  }),
})

const drawCircleToolSchema = z.union([
  z.object({
    center: z.object({ x: z.number(), y: z.number() }),
    radius: z.number().finite().positive().max(100),
    style: z.object({
      strokeWidth: z.number().finite().positive(),
      lineCap: z.enum(['butt', 'round', 'square']).optional(),
      lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
      color: z.string().min(1).optional(),
    }),
  }),
  z.object({
    centerXPercent: z.number(),
    centerYPercent: z.number(),
    radiusPercent: z.number().finite().positive().max(100),
    color: z.string().min(1),
    strokeWidth: z.number().finite().positive(),
  }),
])

const eraseRectToolSchema = z.union([
  z.object({
    rect: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  }),
  z.object({
    xPercent: z.number(),
    yPercent: z.number(),
    widthPercent: z.number(),
    heightPercent: z.number(),
  }),
])

const noPayloadToolSchema = z.object({}).passthrough()

const directCommandSchema = commandSchema
const directCommandsSchema = commandListSchema

export {
  directCommandSchema,
  directCommandsSchema,
  drawCircleToolSchema,
  drawPathToolSchema,
  erasePathToolSchema,
  eraseRectToolSchema,
  noPayloadToolSchema,
}
