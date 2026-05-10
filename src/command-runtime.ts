import { Composites, type Context2D } from './context2d.js'
import type {
  CommandApiStateV1,
  CommandBatchResultV1,
  CommandExecutionResultV1,
  MagicCrayonCommandV1,
  NormalizedPoint,
  NormalizedRect,
} from './command-api.js'
import type { DrawingDocumentV1, StrokeCommand } from './context2d-document.js'

type CommandRuntimeAdapterV1 = {
  getDocument(): DrawingDocumentV1
  setDocument(document: DrawingDocumentV1): void
  appendStroke?(stroke: StrokeCommand): void
  clear(): void
  undo(): void
  redo(): void
  getUndoSize(): number
  getRedoSize(): number
  eraseRect?(rect: NormalizedRect): void
}

const COMMAND_API_VERSION = 1 as const
const SOURCE_SPACE_SIZE = 100
const DEFAULT_COLOR = '#000000'
const CIRCLE_SEGMENTS = 32
const DEFAULT_BEZIER_SEGMENTS = 24
const ELLIPSE_SEGMENTS = 48
const DEFAULT_ARC_SEGMENTS = 24

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}

const isNormalizedValue = (value: unknown): value is number => {
  return isFiniteNumber(value) && value >= 0 && value <= 100
}

const isNormalizedPoint = (point: unknown): point is NormalizedPoint => {
  if (!point || typeof point !== 'object') {
    return false
  }

  const candidate = point as Record<string, unknown>

  return isNormalizedValue(candidate.x) && isNormalizedValue(candidate.y)
}

const isNormalizedRect = (rect: unknown): rect is NormalizedRect => {
  if (!rect || typeof rect !== 'object') {
    return false
  }

  const candidate = rect as Record<string, unknown>

  if (
    !isNormalizedValue(candidate.x) ||
    !isNormalizedValue(candidate.y) ||
    !isNormalizedValue(candidate.width) ||
    !isNormalizedValue(candidate.height)
  ) {
    return false
  }

  return candidate.x + candidate.width <= 100 && candidate.y + candidate.height <= 100
}

const toRectOutlinePoints = (rect: NormalizedRect): NormalizedPoint[] => {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  return [
    { x: rect.x, y: rect.y },
    { x: right, y: rect.y },
    { x: right, y: bottom },
    { x: rect.x, y: bottom },
    { x: rect.x, y: rect.y },
  ]
}

const toBezierPoints = (
  start: NormalizedPoint,
  control1: NormalizedPoint,
  control2: NormalizedPoint,
  end: NormalizedPoint,
  segments: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const inv = 1 - t
    const x =
      inv * inv * inv * start.x +
      3 * inv * inv * t * control1.x +
      3 * inv * t * t * control2.x +
      t * t * t * end.x
    const y =
      inv * inv * inv * start.y +
      3 * inv * inv * t * control1.y +
      3 * inv * t * t * control2.y +
      t * t * t * end.y

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

const toEllipsePoints = (
  center: NormalizedPoint,
  radiusX: number,
  radiusY: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []

  for (let index = 0; index <= ELLIPSE_SEGMENTS; index += 1) {
    const theta = (index / ELLIPSE_SEGMENTS) * Math.PI * 2
    const x = center.x + Math.cos(theta) * radiusX
    const y = center.y + Math.sin(theta) * radiusY

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

const toPolygonPoints = (
  points: NormalizedPoint[],
  closed: boolean,
): NormalizedPoint[] => {
  const normalizedPoints = points.map(point => ({
    x: point.x,
    y: point.y,
  }))

  if (closed) {
    normalizedPoints.push({
      x: points[0].x,
      y: points[0].y,
    })
  }

  return normalizedPoints
}

const toArcPoints = (
  center: NormalizedPoint,
  radius: number,
  startAngleDegrees: number,
  endAngleDegrees: number,
  counterclockwise: boolean,
  segments: number,
): NormalizedPoint[] => {
  const points: NormalizedPoint[] = []
  let delta = endAngleDegrees - startAngleDegrees

  if (!counterclockwise && delta < 0) {
    delta += 360
  }

  if (counterclockwise && delta > 0) {
    delta -= 360
  }

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const angleDegrees = startAngleDegrees + delta * t
    const theta = (angleDegrees * Math.PI) / 180
    const x = center.x + Math.cos(theta) * radius
    const y = center.y + Math.sin(theta) * radius

    points.push({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  return points
}

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

const toStrokeCommand = (command: MagicCrayonCommandV1): StrokeCommand | null => {
  if (
    command.kind !== 'draw-path' &&
    command.kind !== 'erase-path' &&
    command.kind !== 'draw-circle' &&
    command.kind !== 'draw-rect' &&
    command.kind !== 'draw-bezier' &&
    command.kind !== 'draw-ellipse' &&
    command.kind !== 'draw-polygon' &&
    command.kind !== 'draw-arc'
  ) {
    return null
  }

  if (command.kind === 'draw-circle') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (!isFiniteNumber(command.radius) || command.radius <= 0 || command.radius > 100) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const points: Array<{ x: number; y: number }> = []

    for (let index = 0; index <= CIRCLE_SEGMENTS; index += 1) {
      const theta = (index / CIRCLE_SEGMENTS) * Math.PI * 2
      const x = command.center.x + Math.cos(theta) * command.radius
      const y = command.center.y + Math.sin(theta) * command.radius

      points.push({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      })
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points,
    }
  }

  if (command.kind === 'draw-rect') {
    if (
      !isNormalizedRect(command.rect) ||
      command.rect.width <= 0 ||
      command.rect.height <= 0
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: toRectOutlinePoints(command.rect),
    }
  }

  if (command.kind === 'draw-bezier') {
    if (
      !isNormalizedPoint(command.start) ||
      !isNormalizedPoint(command.control1) ||
      !isNormalizedPoint(command.control2) ||
      !isNormalizedPoint(command.end)
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const segments = command.segments ?? DEFAULT_BEZIER_SEGMENTS

    if (!Number.isInteger(segments) || segments < 8 || segments > 128) {
      return null
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: toBezierPoints(
        command.start,
        command.control1,
        command.control2,
        command.end,
        segments,
      ),
    }
  }

  if (command.kind === 'draw-ellipse') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (
      !isFiniteNumber(command.radiusX) ||
      !isFiniteNumber(command.radiusY) ||
      command.radiusX <= 0 ||
      command.radiusY <= 0 ||
      command.radiusX > 100 ||
      command.radiusY > 100
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: toEllipsePoints(command.center, command.radiusX, command.radiusY),
    }
  }

  if (command.kind === 'draw-polygon') {
    if (command.points.length < 3) {
      return null
    }

    if (!command.points.every(point => isNormalizedPoint(point))) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: toPolygonPoints(command.points, command.closed !== false),
    }
  }

  if (command.kind === 'draw-arc') {
    if (!isNormalizedPoint(command.center)) {
      return null
    }

    if (!isFiniteNumber(command.radius) || command.radius <= 0 || command.radius > 100) {
      return null
    }

    if (
      !isFiniteNumber(command.startAngleDegrees) ||
      !isFiniteNumber(command.endAngleDegrees)
    ) {
      return null
    }

    if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
      return null
    }

    const segments = command.segments ?? DEFAULT_ARC_SEGMENTS

    if (!Number.isInteger(segments) || segments < 8 || segments > 128) {
      return null
    }

    if (command.startAngleDegrees === command.endAngleDegrees) {
      return null
    }

    return {
      mode: 'draw',
      strokeStyle: command.style.color ?? DEFAULT_COLOR,
      lineCap: command.style.lineCap ?? 'round',
      lineJoin: command.style.lineJoin ?? 'round',
      lineWidth: command.style.strokeWidth,
      compositing: Composites.DRAW,
      sourceWidth: SOURCE_SPACE_SIZE,
      sourceHeight: SOURCE_SPACE_SIZE,
      points: toArcPoints(
        command.center,
        command.radius,
        command.startAngleDegrees,
        command.endAngleDegrees,
        command.counterclockwise ?? false,
        segments,
      ),
    }
  }

  if (command.points.length < 2) {
    return null
  }

  if (!command.points.every(point => isNormalizedPoint(point))) {
    return null
  }

  if (!isFiniteNumber(command.style.strokeWidth) || command.style.strokeWidth <= 0) {
    return null
  }

  return {
    mode: command.kind === 'draw-path' ? 'draw' : 'erase',
    strokeStyle:
      command.kind === 'draw-path'
        ? (command.style.color ?? DEFAULT_COLOR)
        : DEFAULT_COLOR,
    lineCap: command.style.lineCap ?? 'round',
    lineJoin: command.style.lineJoin ?? 'round',
    lineWidth: command.style.strokeWidth,
    compositing: command.kind === 'draw-path' ? Composites.DRAW : Composites.ERASE,
    sourceWidth: SOURCE_SPACE_SIZE,
    sourceHeight: SOURCE_SPACE_SIZE,
    points: command.points.map(point => ({
      x: point.x,
      y: point.y,
    })),
  }
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

const canUndo = (runtime: CommandRuntimeAdapterV1): boolean => runtime.getUndoSize() > 0
const canRedo = (runtime: CommandRuntimeAdapterV1): boolean => runtime.getRedoSize() > 0

const executeCommandV1 = (
  runtime: CommandRuntimeAdapterV1,
  command: MagicCrayonCommandV1,
): CommandExecutionResultV1 => {
  if (
    command.kind === 'draw-path' ||
    command.kind === 'erase-path' ||
    command.kind === 'draw-circle' ||
    command.kind === 'draw-rect' ||
    command.kind === 'draw-bezier' ||
    command.kind === 'draw-ellipse' ||
    command.kind === 'draw-polygon' ||
    command.kind === 'draw-arc'
  ) {
    const stroke = toStrokeCommand(command)

    if (!stroke) {
      return toRejected(
        command,
        'Draw and erase commands require valid normalized geometry and a positive strokeWidth.',
      )
    }

    appendStroke(runtime, stroke)
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
