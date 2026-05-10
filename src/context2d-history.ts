import { FixedStack, FixedStackEvents } from './fixed-stack.js'
import {
  cloneCommand,
  type DrawingDocumentV1,
  type StrokeCommand,
} from './context2d-document.js'

type CustomNumberEventListener = (evt: CustomEvent<number>) => void
const UNDO_LIMIT = 5

class Context2DHistory {
  protected readonly undo = new FixedStack<StrokeCommand>(UNDO_LIMIT)
  protected readonly redo = new FixedStack<StrokeCommand>(UNDO_LIMIT)
  protected commands: StrokeCommand[] = []

  get undoSize(): number {
    return this.undo.size
  }

  get redoSize(): number {
    return this.redo.size
  }

  add(command: StrokeCommand): void {
    this.commands.push(cloneCommand(command))

    this.undo.push(cloneCommand(command))
  }

  applyUndo(): StrokeCommand {
    const command = this.undo.pop()

    this.redo.push(command)
    this.commands.pop()

    return command
  }

  applyRedo(): StrokeCommand {
    const command = this.redo.pop()

    this.commands.push(cloneCommand(command))
    this.undo.push(cloneCommand(command))

    return command
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

    this.commands = nextStrokes
    this.undo.clear()
    this.redo.clear()

    for (let index = nextStrokes.length - 1; index >= 0; index -= 1) {
      this.undo.push(cloneCommand(nextStrokes[index]))
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
