# [`magic-crayon`](https://www.npmjs.com/package/magic-crayon)

![CI](https://github.com/morganney/magic-crayon/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/morganney/magic-crayon/graph/badge.svg?token=MEDY9C58EZ)](https://codecov.io/gh/morganney/magic-crayon)
[![NPM version](https://img.shields.io/npm/v/magic-crayon.svg)](https://www.npmjs.com/package/magic-crayon)

`magic-crayon` is a framework-agnostic Web Component for freehand drawing on a `<canvas>`.

It ships as a native custom element: `<magic-crayon>`.

## Features

- Native custom element (`magic-crayon`) with Shadow DOM encapsulation
- 16:9 drawing surface with automatic resize handling
- Undo/redo/clear controls
- Two color picker experiences:
  - `crayon` (default)
  - `swatch`
- Configurable selected crayon presentation:
  - `full` (default)
  - `clipped`
- Optional outer boundary cue for host layout delineation:
  - `on` (default)
  - `off`
- Configurable stroke sizing:
  - `stroke-width` (base width for drawing)
  - `eraser-scale` (eraser width multiplier)
- Optional built-in width slider controls:
  - `width-controls` (`off` default)
  - replaceable via `slot="width-controls"`
- Optional action control presentation:
  - `control-style`: `text` (default) or `icon`
- Configurable canvas cursors by mode:
  - `draw-cursor` (default: `crosshair`)
  - `erase-cursor` (default: `cell`)
- Export drawing data as:
  - `blob`
  - `dataurl`
- Public API + custom events for host integration
- CSS custom properties for theming and typography overrides

## Installation

```bash
npm install magic-crayon
```

## Registration

### Option A: Auto registration (side effect)

```ts
import 'magic-crayon/defined'
```

After importing, you can use:

```html
<magic-crayon></magic-crayon>
```

### Option B: Manual registration

```ts
import { MagicCrayon, TAG_NAME } from 'magic-crayon'

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, MagicCrayon)
}
```

## Basic Usage

```html
<magic-crayon
  id="pad"
  serialization="blob"
  color-picker="crayon"
  selected-crayon="full"
  boundary="on"
  control-style="text"
  draw-cursor="crosshair"
  erase-cursor="cell"
  width-controls="off"
  stroke-width="5"
  eraser-scale="1"
></magic-crayon>

<script type="module">
  import 'magic-crayon/defined'

  const pad = document.getElementById('pad')

  pad.addEventListener('save', event => {
    const { data, serialization, meta, timestamp } = event.detail
    console.log({ data, serialization, meta, timestamp })
  })
</script>
```

## Attributes

- `serialization`: `blob | dataurl` (default: `blob`)
- `color-picker`: `crayon | swatch` (default: `crayon`)
- `selected-crayon`: `full | clipped` (default: `full`)
- `boundary`: `on | off` (default: `on`)
- `control-style`: `text | icon` (default: `text`)
- `draw-cursor`: any valid CSS cursor string (default: `crosshair`)
- `erase-cursor`: any valid CSS cursor string (default: `cell`)
- `width-controls`: `on | off` (default: `off`)
- `stroke-width`: positive number (default: `5`)
- `eraser-scale`: positive number (default: `1`)

## Properties

- `serialization: 'blob' | 'dataurl'`
- `colorPicker: 'crayon' | 'swatch'`
- `selectedCrayon: 'full' | 'clipped'`
- `boundary: 'on' | 'off'`
- `controlStyle: 'text' | 'icon'`
- `drawCursor: string`
- `eraseCursor: string`
- `widthControls: 'on' | 'off'`
- `strokeWidth: number` (must be positive)
- `eraserScale: number` (must be positive)
- `drawing: Blob | string | null`

## Methods

- `getDrawingData(serialization?: 'blob' | 'dataurl'): Promise<Blob | string>`
- `setDrawingData(data: Blob | string): Promise<void>`
- `clearDrawingData(): void`

## Events

- `save`
  - `detail`: `{ data, serialization, meta, timestamp }`
- `undoavailabilitychange`
  - `detail`: `{ available, size }`
- `redoavailabilitychange`
  - `detail`: `{ available, size }`
- `widthchange`
  - `detail`: `{ strokeWidth, eraserScale, eraserWidth, source }`

## Slots

- `width-controls`
  - Replaces only the width-controls sub-UI while keeping default tools/actions.
  - Built-in fallback UI is rendered when no assigned content is provided.

## Styling and Theming

`magic-crayon` supports host-level CSS custom property overrides without replacing its
Shadow DOM structure.

Use the component CSS variables (`--magic-crayon-*`) as the stable theming API.

- For a complete token reference, design-system mapping, theme recipes, and
  integration recommendations, see [docs/theming.md](docs/theming.md).
- For structural customization of only the width controls UI, use
  `slot="width-controls"`.

All events bubble and are composed.

## TypeScript

Type declarations are published with the package and mapped via `exports`.

## Development

For local development, build, testing, and Storybook workflows, see [docs/development.md](docs/development.md).
