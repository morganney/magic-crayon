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

export { cloneCommand }
export type { StrokePoint, StrokeCommand, DrawingDocumentV1 }
