import { asRecord, asString } from '../../command-mapper.js'
import type { AdapterParseResult, MagicCrayonVendorAdapter } from '../../types.js'
import type { MagicCrayonCommandV1 } from '../../../command/types.js'
import {
  drawArcToolSchema,
  directCommandSchema,
  directCommandsSchema,
  drawBezierToolSchema,
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
} from '../schema.js'

type ToolSpec = {
  schema: {
    safeParse(input: unknown): { success: true; data: unknown } | { success: false }
  }
  map(input: unknown): MagicCrayonCommandV1[]
}

const normalizeName = (value: string): string => {
  return value
    .replace('magic-crayon.', '')
    .replace('magic_crayon.', '')
    .trim()
    .toLowerCase()
}

const toolRegistry: Record<string, ToolSpec> = {
  'draw-path': {
    schema: drawPathToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        points: Array<{ x: number; y: number }>
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
      }

      return [
        {
          kind: 'draw-path',
          points: data.points,
          style: data.style,
        },
      ]
    },
  },
  'draw-line': {
    schema: drawLineToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        start: { x: number; y: number }
        end: { x: number; y: number }
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
      }

      return [
        {
          kind: 'draw-line',
          start: data.start,
          end: data.end,
          style: data.style,
        },
      ]
    },
  },
  'erase-path': {
    schema: erasePathToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        points: Array<{ x: number; y: number }>
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
        }
      }

      return [
        {
          kind: 'erase-path',
          points: data.points,
          style: data.style,
        },
      ]
    },
  },
  'draw-circle': {
    schema: drawCircleToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const raw = input as
        | {
            center: { x: number; y: number }
            radius: number
            style: {
              strokeWidth: number
              lineCap?: CanvasLineCap
              lineJoin?: CanvasLineJoin
              color?: string
            }
          }
        | {
            centerXPercent: number
            centerYPercent: number
            radiusPercent: number
            color: string
            strokeWidth: number
          }

      if ('center' in raw) {
        return [
          {
            kind: 'draw-circle',
            center: raw.center,
            radius: raw.radius,
            style: raw.style,
          },
        ]
      }

      return [
        {
          kind: 'draw-circle',
          center: {
            x: raw.centerXPercent,
            y: raw.centerYPercent,
          },
          radius: raw.radiusPercent,
          style: {
            strokeWidth: raw.strokeWidth,
            color: raw.color,
          },
        },
      ]
    },
  },
  'draw-rect': {
    schema: drawRectToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const raw = input as
        | {
            rect: {
              x: number
              y: number
              width: number
              height: number
            }
            style: {
              strokeWidth: number
              lineCap?: CanvasLineCap
              lineJoin?: CanvasLineJoin
              color?: string
            }
          }
        | {
            xPercent: number
            yPercent: number
            widthPercent: number
            heightPercent: number
            color: string
            strokeWidth: number
          }

      if ('rect' in raw) {
        return [
          {
            kind: 'draw-rect',
            rect: raw.rect,
            style: raw.style,
          },
        ]
      }

      return [
        {
          kind: 'draw-rect',
          rect: {
            x: raw.xPercent,
            y: raw.yPercent,
            width: raw.widthPercent,
            height: raw.heightPercent,
          },
          style: {
            strokeWidth: raw.strokeWidth,
            color: raw.color,
          },
        },
      ]
    },
  },
  'draw-bezier': {
    schema: drawBezierToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        start: { x: number; y: number }
        control1: { x: number; y: number }
        control2: { x: number; y: number }
        end: { x: number; y: number }
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
        segments?: number
      }

      return [
        {
          kind: 'draw-bezier',
          start: data.start,
          control1: data.control1,
          control2: data.control2,
          end: data.end,
          style: data.style,
          segments: data.segments,
        },
      ]
    },
  },
  'draw-ellipse': {
    schema: drawEllipseToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        center: { x: number; y: number }
        radiusX: number
        radiusY: number
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
      }

      return [
        {
          kind: 'draw-ellipse',
          center: data.center,
          radiusX: data.radiusX,
          radiusY: data.radiusY,
          style: data.style,
        },
      ]
    },
  },
  'draw-polygon': {
    schema: drawPolygonToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        points: Array<{ x: number; y: number }>
        closed?: boolean
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
      }

      return [
        {
          kind: 'draw-polygon',
          points: data.points,
          closed: data.closed,
          style: data.style,
        },
      ]
    },
  },
  'draw-arc': {
    schema: drawArcToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        center: { x: number; y: number }
        radius: number
        startAngleDegrees: number
        endAngleDegrees: number
        counterclockwise?: boolean
        style: {
          strokeWidth: number
          lineCap?: CanvasLineCap
          lineJoin?: CanvasLineJoin
          color?: string
        }
        segments?: number
      }

      return [
        {
          kind: 'draw-arc',
          center: data.center,
          radius: data.radius,
          startAngleDegrees: data.startAngleDegrees,
          endAngleDegrees: data.endAngleDegrees,
          counterclockwise: data.counterclockwise,
          style: data.style,
          segments: data.segments,
        },
      ]
    },
  },
  'fill-rect': {
    schema: fillRectToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        rect: {
          x: number
          y: number
          width: number
          height: number
        }
        style: {
          strokeWidth: number
          color?: string
        }
      }

      return [
        {
          kind: 'fill-rect',
          rect: data.rect,
          style: data.style,
        },
      ]
    },
  },
  'fill-circle': {
    schema: fillCircleToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        center: { x: number; y: number }
        radius: number
        style: {
          strokeWidth: number
          color?: string
        }
      }

      return [
        {
          kind: 'fill-circle',
          center: data.center,
          radius: data.radius,
          style: data.style,
        },
      ]
    },
  },
  'fill-polygon': {
    schema: fillPolygonToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const data = input as {
        points: Array<{ x: number; y: number }>
        style: {
          strokeWidth: number
          color?: string
        }
      }

      return [
        {
          kind: 'fill-polygon',
          points: data.points,
          style: data.style,
        },
      ]
    },
  },
  'erase-rect': {
    schema: eraseRectToolSchema,
    map(input): MagicCrayonCommandV1[] {
      const raw = input as
        | {
            rect: {
              x: number
              y: number
              width: number
              height: number
            }
          }
        | {
            xPercent: number
            yPercent: number
            widthPercent: number
            heightPercent: number
          }

      if ('rect' in raw) {
        return [
          {
            kind: 'erase-rect',
            rect: raw.rect,
          },
        ]
      }

      return [
        {
          kind: 'erase-rect',
          rect: {
            x: raw.xPercent,
            y: raw.yPercent,
            width: raw.widthPercent,
            height: raw.heightPercent,
          },
        },
      ]
    },
  },
  clear: {
    schema: noPayloadToolSchema,
    map(): MagicCrayonCommandV1[] {
      return [{ kind: 'clear' }]
    },
  },
  undo: {
    schema: noPayloadToolSchema,
    map(): MagicCrayonCommandV1[] {
      return [{ kind: 'undo' }]
    },
  },
  redo: {
    schema: noPayloadToolSchema,
    map(): MagicCrayonCommandV1[] {
      return [{ kind: 'redo' }]
    },
  },
}

const aiSdkAdapter: MagicCrayonVendorAdapter = {
  vendor: 'ai-sdk',
  parse(input: unknown): AdapterParseResult {
    const value = asRecord(input)

    if (!value) {
      return {
        ok: false,
        reason: 'AI SDK payload must be an object.',
      }
    }

    const directCommands = directCommandsSchema.safeParse(value.commands)

    if (directCommands.success) {
      return {
        ok: true,
        commands: directCommands.data,
      }
    }

    const directCommand = directCommandSchema.safeParse(value.command)

    if (directCommand.success) {
      return {
        ok: true,
        commands: [directCommand.data],
      }
    }

    const toolName = asString(value.toolName) ?? asString(value.tool)

    if (!toolName) {
      return {
        ok: false,
        reason: 'AI SDK payload must include commands, command, or toolName.',
      }
    }

    const toolInput = value.input ?? value.args ?? value.arguments

    if (toolName === 'magic-crayon.batch' || toolName === 'magic_crayon.batch') {
      const batch = directCommandsSchema.safeParse(asRecord(toolInput)?.commands)

      if (!batch.success) {
        return {
          ok: false,
          reason: 'AI SDK batch payload must include a valid commands array.',
        }
      }

      return {
        ok: true,
        commands: batch.data,
      }
    }

    const normalized = normalizeName(toolName)
    const spec = toolRegistry[normalized]

    if (!spec) {
      return {
        ok: false,
        reason: `Unsupported AI SDK tool call: ${toolName}`,
      }
    }

    const parsed = spec.schema.safeParse(toolInput ?? {})

    if (!parsed.success) {
      return {
        ok: false,
        reason: `Invalid AI SDK payload for tool: ${toolName}`,
      }
    }

    return {
      ok: true,
      commands: spec.map(parsed.data),
    }
  },
}

export { aiSdkAdapter }
export type {
  AdapterParseFailure,
  AdapterParseResult,
  AdapterParseSuccess,
  MagicCrayonVendorAdapter,
} from '../../types.js'
