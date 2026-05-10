import type { Context2DMetaData } from './context2d.js'
import type {
  CommandApiStateV1,
  CommandBatchResultV1,
  CommandExecutionResultV1,
  MagicCrayonCommandV1,
} from './command-api.js'

export type Serialization = 'blob' | 'dataurl'
export type ColorPicker = 'crayon' | 'swatch' | 'input'
export type SelectedCrayon = 'full' | 'clipped'
export type Boundary = 'on' | 'off'
export type Anchor = 'top' | 'center' | 'bottom'
export type WidthControls = 'on' | 'off'
export type ControlStyle = 'text' | 'icon'
export type CanvasBackground = 'white' | 'black'
export type CursorStyle = string
export type DrawingData = Blob | string

export type SaveDetail = {
  data: DrawingData
  serialization: Serialization
  meta: Context2DMetaData
  timestamp: string
}

export type AvailabilityDetail = {
  available: boolean
  size: number
}

export type WidthChangeDetail = {
  strokeWidth: number
  eraserScale: number
  eraserWidth: number
  source: 'stroke' | 'eraser'
}

export type {
  CommandApiStateV1,
  CommandBatchResultV1,
  CommandExecutionResultV1,
  MagicCrayonCommandV1,
}
