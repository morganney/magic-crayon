import { describe, expect, it } from 'vitest'

import { parseCrayonIcon, parseTemplateNode, toSvgElement } from '../src/helpers.js'

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
})
