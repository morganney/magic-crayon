import { asRecord, asString } from '../../command-mapper.js'
import type { AdapterParseResult, MagicCrayonVendorAdapter } from '../../types.js'
import type { MagicCrayonCommandV1 } from '../../../command-api.js'
import {
  directCommandSchema,
  directCommandsSchema,
  drawCircleToolSchema,
  drawPathToolSchema,
  erasePathToolSchema,
  eraseRectToolSchema,
  noPayloadToolSchema,
} from './schema.js'

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

const copilotKitAdapter: MagicCrayonVendorAdapter = {
  vendor: 'copilotkit',
  parse(input: unknown): AdapterParseResult {
    const value = asRecord(input)

    if (!value) {
      return {
        ok: false,
        reason: 'CopilotKit payload must be an object.',
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

    const actionName =
      asString(value.name) ?? asString(value.action) ?? asString(value.actionName)

    if (!actionName) {
      return {
        ok: false,
        reason: 'CopilotKit payload must include commands, command, or action name.',
      }
    }

    const args = value.arguments ?? value.args ?? value.params ?? value.input

    if (actionName === 'magic-crayon.batch' || actionName === 'magic_crayon.batch') {
      const batch = directCommandsSchema.safeParse(asRecord(args)?.commands)

      if (!batch.success) {
        return {
          ok: false,
          reason: 'CopilotKit batch payload must include a valid commands array.',
        }
      }

      return {
        ok: true,
        commands: batch.data,
      }
    }

    const normalized = normalizeName(actionName)
    const spec = toolRegistry[normalized]

    if (!spec) {
      return {
        ok: false,
        reason: `Unsupported CopilotKit action: ${actionName}`,
      }
    }

    const parsed = spec.schema.safeParse(args ?? {})

    if (!parsed.success) {
      return {
        ok: false,
        reason: `Invalid CopilotKit payload for action: ${actionName}`,
      }
    }

    return {
      ok: true,
      commands: spec.map(parsed.data),
    }
  },
}

export { copilotKitAdapter }
