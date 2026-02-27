import type { Context2DMetaData } from './context2d.js'

export type Serialization = 'blob' | 'dataurl'
export type ColorPicker = 'crayon' | 'swatch' | 'input'
export type SelectedCrayon = 'full' | 'clipped'
export type Boundary = 'on' | 'off'
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
