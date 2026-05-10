import { describe, expect, it } from 'vitest'

import {
  assertAnchor,
  assertCanvasBackground,
  assertControlStyle,
  assertSaveDocument,
  parseActionIcon,
  parseCrayonIcon,
  parseTemplateNode,
  toSvgElement,
} from '../src/helpers.js'

describe('helpers', () => {
  it('throws when template html does not include #magic-crayon-template', () => {
    expect(() => parseTemplateNode('<div></div>')).toThrow(
      'Expected #magic-crayon-template in template.html.',
    )
  })

  it('throws when parsed crayon icon does not have an svg root', () => {
    expect(() => parseCrayonIcon('<g></g>')).toThrow(
      'Expected a root SVG element in pencil.svg.',
    )
  })

  it('throws when converting a non-svg node to svg element', () => {
    expect(() => toSvgElement(document.createElement('div'))).toThrow(
      'Expected crayon icon clone to be an SVGElement.',
    )
  })

  it('throws when control-style is invalid', () => {
    expect(() => assertControlStyle('other')).toThrow(
      'control-style must be either "text" or "icon".',
    )
  })

  it('throws when anchor is invalid', () => {
    expect(() => assertAnchor('other')).toThrow(
      'anchor must be either "top", "center", or "bottom".',
    )
  })

  it('throws when canvas-background is invalid', () => {
    expect(() => assertCanvasBackground('other')).toThrow(
      'canvas-background must be either "white" or "black".',
    )
  })

  it('throws when save-document is invalid', () => {
    expect(() => assertSaveDocument('other')).toThrow(
      'save-document must be either "on" or "off".',
    )
  })

  it('normalizes action icon styling to currentColor', () => {
    const icon = parseActionIcon(
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#fff" /></svg>',
      'undo.svg',
    )
    const path = icon.querySelector('path')

    expect(icon.getAttribute('fill')).toBe('currentColor')
    expect(path?.getAttribute('fill')).toBe('currentColor')
  })
})
