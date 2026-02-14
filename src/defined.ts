import { MagicCrayon, TAG_NAME } from './magic-crayon.js'

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, MagicCrayon)
}

const defined = await customElements.whenDefined(TAG_NAME)

export default defined
