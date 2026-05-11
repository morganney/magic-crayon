import { FixedStack, FixedStackEvents } from './fixed-stack.js'
import {
  cloneCommand,
  type DrawingDocumentV1,
  type StrokeCommand,
} from './context2d-document.js'

type CustomNumberEventListener = (evt: CustomEvent<number>) => void
const UNDO_LIMIT = 5
type StrokeCommandBatch = StrokeCommand[]

class Context2DHistory {
  protected readonly commandLimit: number
  protected readonly undo = new FixedStack<StrokeCommandBatch>(UNDO_LIMIT)
  protected readonly redo = new FixedStack<StrokeCommandBatch>(UNDO_LIMIT)
  protected commands: StrokeCommand[] = []

  constructor(commandLimit: number = Number.POSITIVE_INFINITY) {
    if (Number.isFinite(commandLimit)) {
      if (!Number.isInteger(commandLimit) || commandLimit < UNDO_LIMIT) {
        throw new Error(
          `Context2DHistory commandLimit must be an integer >= ${UNDO_LIMIT}.`,
        )
      }
    }

    this.commandLimit = commandLimit
  }

  protected limitCommands(commands: StrokeCommand[]): StrokeCommand[] {
    if (!Number.isFinite(this.commandLimit) || commands.length <= this.commandLimit) {
      return commands
    }

    return commands.slice(commands.length - this.commandLimit)
  }

  get undoSize(): number {
    return this.undo.size
  }

  get redoSize(): number {
    return this.redo.size
  }

  add(command: StrokeCommand): void {
    this.addBatch([command])
  }

  addBatch(commands: StrokeCommand[]): void {
    if (commands.length === 0) {
      return
    }

    const batch = commands.map(command => cloneCommand(command))
    const nextCommands = this.limitCommands([
      ...this.commands,
      ...batch.map(command => cloneCommand(command)),
    ])
    const retainedBatch = nextCommands.slice(
      Math.max(0, nextCommands.length - batch.length),
    )

    if (retainedBatch.length === 0) {
      return
    }

    this.commands = nextCommands

    this.undo.push(retainedBatch.map(command => cloneCommand(command)))
  }

  applyUndo(): StrokeCommand {
    const batch = this.undo.pop()

    for (let index = 0; index < batch.length; index += 1) {
      this.commands.pop()
    }

    this.redo.push(batch.map(command => cloneCommand(command)))

    return cloneCommand(batch[batch.length - 1] as StrokeCommand)
  }

  applyRedo(): StrokeCommand {
    const batch = this.redo.pop()
    const nextCommands = this.limitCommands([
      ...this.commands,
      ...batch.map(command => cloneCommand(command)),
    ])
    const retainedBatch = nextCommands.slice(
      Math.max(0, nextCommands.length - batch.length),
    )

    this.commands = nextCommands
    this.undo.push(retainedBatch.map(command => cloneCommand(command)))

    return cloneCommand(retainedBatch[retainedBatch.length - 1] as StrokeCommand)
  }

  clear(): void {
    this.commands = []
    this.undo.clear()
    this.redo.clear()
  }

  clearRedo(): void {
    this.redo.clear()
  }

  getCommands(): StrokeCommand[] {
    return this.commands.map(command => cloneCommand(command))
  }

  getDocument(): DrawingDocumentV1 {
    return {
      version: 1,
      strokes: this.getCommands(),
    }
  }

  setDocument(document: DrawingDocumentV1): void {
    const nextStrokes = document.strokes.map(stroke => cloneCommand(stroke))

    this.commands = this.limitCommands(nextStrokes)
    this.undo.clear()
    this.redo.clear()

    for (const stroke of this.commands) {
      this.undo.push([cloneCommand(stroke)])
    }
  }

  registerListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.undo.addEventListener(FixedStackEvents.SIZE_CHANGE, undo as EventListener)
    this.redo.addEventListener(FixedStackEvents.SIZE_CHANGE, redo as EventListener)
  }

  unregisterListeners(
    undo: CustomNumberEventListener,
    redo: CustomNumberEventListener,
  ): void {
    this.undo.removeEventListener(FixedStackEvents.SIZE_CHANGE, undo as EventListener)
    this.redo.removeEventListener(FixedStackEvents.SIZE_CHANGE, redo as EventListener)
  }
}

export { Context2DHistory }
export type { CustomNumberEventListener }
