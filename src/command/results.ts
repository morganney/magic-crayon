import { COMMAND_API_VERSION } from './constants.js'
import type { CommandExecutionResultV1, MagicCrayonCommandV1 } from './types.js'

const toRejected = (
  command: MagicCrayonCommandV1,
  reason: string,
): CommandExecutionResultV1 => {
  return {
    version: COMMAND_API_VERSION,
    status: 'rejected',
    command,
    reason,
  }
}

const toApplied = (command: MagicCrayonCommandV1): CommandExecutionResultV1 => {
  return {
    version: COMMAND_API_VERSION,
    status: 'applied',
    command,
  }
}

const toNoop = (
  command: MagicCrayonCommandV1,
  reason: string,
): CommandExecutionResultV1 => {
  return {
    version: COMMAND_API_VERSION,
    status: 'noop',
    command,
    reason,
  }
}

export { toApplied, toNoop, toRejected }
