import type { Context2D } from '../context2d.js'
import type { DrawingDocumentV1, StrokeCommand } from '../context2d-document.js'
import { COMMAND_API_VERSION } from './constants.js'
import { isNormalizedRect } from './geometry.js'
import { toApplied, toNoop, toRejected } from './results.js'
import { toStrokeCommands } from './stroke-mapper.js'
import type {
  CommandApiStateV1,
  CommandBatchResultV1,
  CommandExecutionResultV1,
  MagicCrayonCommandV1,
  NormalizedRect,
} from './types.js'

type CommandRuntimeAdapterV1 = {
  getDocument(): DrawingDocumentV1
  setDocument(document: DrawingDocumentV1): void
  appendStroke?(stroke: StrokeCommand): void
  appendStrokes?(strokes: StrokeCommand[]): void
  clear(): void
  undo(): void
  redo(): void
  getUndoSize(): number
  getRedoSize(): number
  eraseRect?(rect: NormalizedRect): void
}

const appendStroke = (runtime: CommandRuntimeAdapterV1, stroke: StrokeCommand): void => {
  if (runtime.appendStroke) {
    runtime.appendStroke(stroke)

    return
  }

  const current = runtime.getDocument()

  runtime.setDocument({
    version: 1,
    strokes: [...current.strokes, stroke],
  })
}

const appendStrokes = (
  runtime: CommandRuntimeAdapterV1,
  strokes: StrokeCommand[],
): void => {
  if (strokes.length === 0) {
    return
  }

  if (strokes.length === 1) {
    appendStroke(runtime, strokes[0])

    return
  }

  if (runtime.appendStrokes) {
    runtime.appendStrokes(strokes)

    return
  }

  if (runtime.appendStroke) {
    for (const stroke of strokes) {
      runtime.appendStroke(stroke)
    }

    return
  }

  const current = runtime.getDocument()

  runtime.setDocument({
    version: 1,
    strokes: [...current.strokes, ...strokes],
  })
}

const canUndo = (runtime: CommandRuntimeAdapterV1): boolean => runtime.getUndoSize() > 0
const canRedo = (runtime: CommandRuntimeAdapterV1): boolean => runtime.getRedoSize() > 0

const executeCommandV1 = (
  runtime: CommandRuntimeAdapterV1,
  command: MagicCrayonCommandV1,
): CommandExecutionResultV1 => {
  if (
    command.kind === 'draw-path' ||
    command.kind === 'draw-line' ||
    command.kind === 'erase-path' ||
    command.kind === 'draw-circle' ||
    command.kind === 'draw-rect' ||
    command.kind === 'draw-bezier' ||
    command.kind === 'draw-ellipse' ||
    command.kind === 'draw-polygon' ||
    command.kind === 'draw-arc' ||
    command.kind === 'fill-rect' ||
    command.kind === 'fill-circle' ||
    command.kind === 'fill-polygon'
  ) {
    const strokes = toStrokeCommands(command)

    if (!strokes || strokes.length === 0) {
      return toRejected(
        command,
        'Stroke commands require valid normalized geometry and a positive strokeWidth.',
      )
    }

    appendStrokes(runtime, strokes)
    return toApplied(command)
  }

  if (command.kind === 'erase-rect') {
    if (!isNormalizedRect(command.rect)) {
      return toRejected(
        command,
        'erase-rect requires normalized rect values in 0..100 and in-bounds dimensions.',
      )
    }

    if (!runtime.eraseRect) {
      return toRejected(
        command,
        'erase-rect is not implemented for this runtime adapter.',
      )
    }

    runtime.eraseRect(command.rect)
    return toApplied(command)
  }

  if (command.kind === 'clear') {
    if (runtime.getDocument().strokes.length === 0) {
      return toNoop(command, 'Canvas is already clear.')
    }

    runtime.clear()
    return toApplied(command)
  }

  if (command.kind === 'undo') {
    if (!canUndo(runtime)) {
      return toNoop(command, 'No undo history is available.')
    }

    runtime.undo()
    return toApplied(command)
  }

  if (command.kind === 'redo') {
    if (!canRedo(runtime)) {
      return toNoop(command, 'No redo history is available.')
    }

    runtime.redo()
    return toApplied(command)
  }

  if (command.kind === 'replace-document') {
    if (command.document.version !== 1) {
      return toRejected(command, 'replace-document only supports document version 1.')
    }

    runtime.setDocument(command.document)
    return toApplied(command)
  }

  return toRejected(command, 'Unsupported command kind.')
}

const executeCommandBatchV1 = (
  runtime: CommandRuntimeAdapterV1,
  commands: MagicCrayonCommandV1[],
): CommandBatchResultV1 => {
  return {
    version: COMMAND_API_VERSION,
    results: commands.map(command => executeCommandV1(runtime, command)),
  }
}

const getCommandApiStateV1 = (runtime: CommandRuntimeAdapterV1): CommandApiStateV1 => {
  return {
    version: COMMAND_API_VERSION,
    undoSize: runtime.getUndoSize(),
    redoSize: runtime.getRedoSize(),
    document: runtime.getDocument(),
  }
}

const createContext2DCommandRuntime = (context2d: Context2D): CommandRuntimeAdapterV1 => {
  return {
    getDocument: () => context2d.getDocument(),
    setDocument: document => context2d.setDocument(document),
    appendStroke: stroke => context2d.appendStroke(stroke),
    appendStrokes: strokes => context2d.appendStrokes(strokes),
    clear: () => context2d.clear(),
    undo: () => context2d.applyUndo(),
    redo: () => context2d.applyRedo(),
    getUndoSize: () => context2d.undoStackSize,
    getRedoSize: () => context2d.redoStackSize,
  }
}

export {
  createContext2DCommandRuntime,
  executeCommandBatchV1,
  executeCommandV1,
  getCommandApiStateV1,
}
export type { CommandRuntimeAdapterV1 }
