const HISTORY_LIMIT = 5

type StrokePoint = {
  x: number
  y: number
}

type StrokeCommand = {
  mode: 'draw' | 'erase'
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  lineWidth: number
  compositing: GlobalCompositeOperation
  sourceWidth: number
  sourceHeight: number
  points: StrokePoint[]
}

type DrawingDocumentV1 = {
  version: 1
  strokes: StrokeCommand[]
}

const cloneCommand = (command: StrokeCommand): StrokeCommand => {
  return {
    ...command,
    points: command.points.map(point => ({ ...point })),
  }
}

const clampHistory = (strokes: StrokeCommand[]): StrokeCommand[] => {
  if (strokes.length <= HISTORY_LIMIT) {
    return strokes
  }

  return strokes.slice(strokes.length - HISTORY_LIMIT)
}

export { HISTORY_LIMIT, cloneCommand, clampHistory }
export type { StrokePoint, StrokeCommand, DrawingDocumentV1 }
