import type { MagicCrayonCommandV1 } from '../command/types.js'
import { commandListSchema, commandSchema, toCommand } from './schemas.js'

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

const asString = (value: unknown): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null
}

const toCommandKind = (value: string): MagicCrayonCommandV1['kind'] | null => {
  const normalized = value.trim().toLowerCase().replaceAll('_', '-')

  if (
    normalized === 'draw-path' ||
    normalized === 'draw-line' ||
    normalized === 'draw-circle' ||
    normalized === 'draw-rect' ||
    normalized === 'draw-bezier' ||
    normalized === 'draw-ellipse' ||
    normalized === 'draw-polygon' ||
    normalized === 'draw-arc' ||
    normalized === 'fill-rect' ||
    normalized === 'fill-circle' ||
    normalized === 'fill-polygon' ||
    normalized === 'erase-path' ||
    normalized === 'erase-rect' ||
    normalized === 'replace-document' ||
    normalized === 'clear' ||
    normalized === 'undo' ||
    normalized === 'redo'
  ) {
    return normalized
  }

  return null
}

const parseCommandFromKindAndPayload = (
  kind: string,
  payload: unknown,
): MagicCrayonCommandV1 | null => {
  const commandKind = toCommandKind(kind)

  if (!commandKind) {
    return null
  }

  const commandCandidate = { ...(asRecord(payload) ?? {}), kind: commandKind }
  const parsed = commandSchema.safeParse(commandCandidate)

  return parsed.success ? toCommand(parsed.data) : null
}

const parseCommandEnvelope = (value: unknown): MagicCrayonCommandV1 | null => {
  const parsed = commandSchema.safeParse(value)

  return parsed.success ? toCommand(parsed.data) : null
}

const parseCommandList = (value: unknown): MagicCrayonCommandV1[] | null => {
  const parsed = commandListSchema.safeParse(value)

  return parsed.success ? parsed.data.map(command => toCommand(command)) : null
}

export {
  asRecord,
  asString,
  parseCommandEnvelope,
  parseCommandFromKindAndPayload,
  parseCommandList,
}
