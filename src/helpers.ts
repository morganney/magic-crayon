import { Serializations } from './context2d.js'
import type {
  Boundary,
  ColorPicker,
  SelectedCrayon,
  Serialization,
  WidthControls,
} from './types.js'

const parser = new DOMParser()

export const parseTemplateNode = (html: string): HTMLTemplateElement => {
  const document = parser.parseFromString(html, 'text/html')
  const node = document.querySelector('template#magic-crayon-template')

  if (!(node instanceof HTMLTemplateElement)) {
    throw new Error('Expected #magic-crayon-template in template.html.')
  }

  return node
}

export const parseCrayonIcon = (svg: string): SVGElement => {
  const document = parser.parseFromString(svg, 'image/svg+xml')
  const node = document.documentElement

  if (!(node instanceof SVGElement) || node.tagName.toLowerCase() !== 'svg') {
    throw new Error('Expected a root SVG element in pencil.svg.')
  }

  return node
}

export const serializationToEnum = {
  blob: Serializations.BLOB,
  dataurl: Serializations.DATA_URL,
} as const

export const assertSerialization = (value: string | null): Serialization => {
  if (value === 'blob' || value === 'dataurl') {
    return value
  }

  throw new TypeError('serialization must be either "blob" or "dataurl".')
}

export const assertColorPicker = (value: string | null): ColorPicker => {
  if (value === 'crayon' || value === 'swatch') {
    return value
  }

  throw new TypeError('color-picker must be either "crayon" or "swatch".')
}

export const assertSelectedCrayon = (value: string | null): SelectedCrayon => {
  if (value === 'full' || value === 'clipped') {
    return value
  }

  throw new TypeError('selected-crayon must be either "full" or "clipped".')
}

export const assertBoundary = (value: string | null): Boundary => {
  if (value === 'on' || value === 'off') {
    return value
  }

  throw new TypeError('boundary must be either "on" or "off".')
}

export const assertWidthControls = (value: string | null): WidthControls => {
  if (value === 'on' || value === 'off') {
    return value
  }

  throw new TypeError('width-controls must be either "on" or "off".')
}

const assertPositiveNumber = (value: number, name: string): number => {
  if (Number.isFinite(value) && value > 0) {
    return value
  }

  throw new TypeError(`${name} must be a positive number.`)
}

export const assertStrokeWidth = (value: number): number =>
  assertPositiveNumber(value, 'stroke-width')

export const assertEraserScale = (value: number): number =>
  assertPositiveNumber(value, 'eraser-scale')

export const parseStrokeWidth = (value: string | null): number =>
  assertStrokeWidth(Number(value))

export const parseEraserScale = (value: string | null): number =>
  assertEraserScale(Number(value))

export const isElement = (value: EventTarget | null): value is Element =>
  value instanceof Element

export const isHTMLButtonElement = (
  value: EventTarget | null,
): value is HTMLButtonElement => value instanceof HTMLButtonElement

export const isHTMLInputElement = (
  value: EventTarget | null,
): value is HTMLInputElement => value instanceof HTMLInputElement

export const toSvgElement = (value: Node): SVGElement => {
  if (value instanceof SVGElement) {
    return value
  }

  throw new Error('Expected crayon icon clone to be an SVGElement.')
}
