export type CommandApiVersion = 1

export type NormalizedPoint = {
  x: number
  y: number
}

export type NormalizedRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CommandStrokeStyle = {
  strokeWidth: number
  lineCap?: CanvasLineCap
  lineJoin?: CanvasLineJoin
  color?: string
}

export type DrawPathCommand = {
  kind: 'draw-path'
  points: NormalizedPoint[]
  style: CommandStrokeStyle
}

export type DrawCircleCommand = {
  kind: 'draw-circle'
  center: NormalizedPoint
  radius: number
  style: CommandStrokeStyle
}

export type DrawRectCommand = {
  kind: 'draw-rect'
  rect: NormalizedRect
  style: CommandStrokeStyle
}

export type DrawBezierCommand = {
  kind: 'draw-bezier'
  start: NormalizedPoint
  control1: NormalizedPoint
  control2: NormalizedPoint
  end: NormalizedPoint
  style: CommandStrokeStyle
  segments?: number
}

export type DrawEllipseCommand = {
  kind: 'draw-ellipse'
  center: NormalizedPoint
  radiusX: number
  radiusY: number
  style: CommandStrokeStyle
}

export type DrawPolygonCommand = {
  kind: 'draw-polygon'
  points: NormalizedPoint[]
  closed?: boolean
  style: CommandStrokeStyle
}

export type DrawArcCommand = {
  kind: 'draw-arc'
  center: NormalizedPoint
  radius: number
  startAngleDegrees: number
  endAngleDegrees: number
  counterclockwise?: boolean
  style: CommandStrokeStyle
  segments?: number
}

export type ErasePathCommand = {
  kind: 'erase-path'
  points: NormalizedPoint[]
  style: Omit<CommandStrokeStyle, 'color'>
}

export type EraseRectCommand = {
  kind: 'erase-rect'
  rect: NormalizedRect
}

export type ClearCommand = {
  kind: 'clear'
}

export type UndoCommand = {
  kind: 'undo'
}

export type RedoCommand = {
  kind: 'redo'
}

export type ReplaceDocumentCommand = {
  kind: 'replace-document'
  document: import('./context2d-document.js').DrawingDocumentV1
}

export type MagicCrayonCommandV1 =
  | DrawPathCommand
  | DrawCircleCommand
  | DrawRectCommand
  | DrawBezierCommand
  | DrawEllipseCommand
  | DrawPolygonCommand
  | DrawArcCommand
  | ErasePathCommand
  | EraseRectCommand
  | ClearCommand
  | UndoCommand
  | RedoCommand
  | ReplaceDocumentCommand

export type CommandExecutionStatus = 'applied' | 'rejected' | 'noop'

export type CommandExecutionResultV1 = {
  version: CommandApiVersion
  status: CommandExecutionStatus
  command: MagicCrayonCommandV1
  reason?: string
}

export type CommandBatchResultV1 = {
  version: CommandApiVersion
  results: CommandExecutionResultV1[]
}

export type CommandApiStateV1 = {
  version: CommandApiVersion
  undoSize: number
  redoSize: number
  document: import('./context2d-document.js').DrawingDocumentV1
}
