import { z } from 'zod'

import { commandListSchema, commandSchema } from '../schemas.js'

const drawPathToolSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const drawLineToolSchema = z.object({
  start: z.object({ x: z.number(), y: z.number() }),
  end: z.object({ x: z.number(), y: z.number() }),
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

const drawRectToolSchema = z.union([
  z.object({
    rect: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().finite().positive().max(100),
      height: z.number().finite().positive().max(100),
    }),
    style: z.object({
      strokeWidth: z.number().finite().positive(),
      lineCap: z.enum(['butt', 'round', 'square']).optional(),
      lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
      color: z.string().min(1).optional(),
    }),
  }),
  z.object({
    xPercent: z.number(),
    yPercent: z.number(),
    widthPercent: z.number().finite().positive().max(100),
    heightPercent: z.number().finite().positive().max(100),
    color: z.string().min(1),
    strokeWidth: z.number().finite().positive(),
  }),
])

const drawBezierToolSchema = z.object({
  start: z.object({ x: z.number(), y: z.number() }),
  control1: z.object({ x: z.number(), y: z.number() }),
  control2: z.object({ x: z.number(), y: z.number() }),
  end: z.object({ x: z.number(), y: z.number() }),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
  segments: z.number().int().min(8).max(128).optional(),
})

const drawEllipseToolSchema = z.object({
  center: z.object({ x: z.number(), y: z.number() }),
  radiusX: z.number().finite().positive().max(100),
  radiusY: z.number().finite().positive().max(100),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const drawPolygonToolSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
  closed: z.boolean().optional(),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const drawArcToolSchema = z.object({
  center: z.object({ x: z.number(), y: z.number() }),
  radius: z.number().finite().positive().max(100),
  startAngleDegrees: z.number().finite().min(-1440).max(1440),
  endAngleDegrees: z.number().finite().min(-1440).max(1440),
  counterclockwise: z.boolean().optional(),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
  segments: z.number().int().min(8).max(128).optional(),
})

const fillRectToolSchema = z.object({
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().finite().positive().max(100),
    height: z.number().finite().positive().max(100),
  }),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const fillCircleToolSchema = z.object({
  center: z.object({ x: z.number(), y: z.number() }),
  radius: z.number().finite().positive().max(100),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

const fillPolygonToolSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
  style: z.object({
    strokeWidth: z.number().finite().positive(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['bevel', 'round', 'miter']).optional(),
    color: z.string().min(1).optional(),
  }),
})

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
  drawArcToolSchema,
  drawBezierToolSchema,
  directCommandSchema,
  directCommandsSchema,
  drawCircleToolSchema,
  drawEllipseToolSchema,
  drawLineToolSchema,
  drawPathToolSchema,
  drawPolygonToolSchema,
  drawRectToolSchema,
  fillCircleToolSchema,
  fillPolygonToolSchema,
  fillRectToolSchema,
  erasePathToolSchema,
  eraseRectToolSchema,
  noPayloadToolSchema,
}
