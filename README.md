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

### Consumer Theming Contract

Treat CSS custom properties as the stable theming API for visual customization.

- Prefer overriding `--magic-crayon-*` tokens on `magic-crayon`.
- Avoid depending on internal Shadow DOM class names for long-term styling.
- Use the `width-controls` slot only when you need custom control markup/behavior.
- Keep semantic defaults (for example, high contrast between button text and button
  background).

The component keeps behavioral APIs (attributes/properties/events) separate from
theming APIs (custom properties) so consumers can rebrand without changing runtime
integration.

Example:

```css
magic-crayon {
  --magic-crayon-font-family: 'Inter', system-ui, sans-serif;
  --magic-crayon-controls-bg: #111827;
  --magic-crayon-button-bg: #2563eb;
  --magic-crayon-button-border: #2563eb;
  --magic-crayon-button-color: #ffffff;
}
```

### Theme Tokens

#### Typography

- `--magic-crayon-font-family`

#### Surfaces and Layout

- `--magic-crayon-controls-bg`
- `--magic-crayon-panel-bg-open`
- `--magic-crayon-boundary-color`
- `--magic-crayon-boundary-bg`
- `--magic-crayon-canvas-bg`

#### Buttons and Actions

- `--magic-crayon-button-bg`
- `--magic-crayon-button-border`
- `--magic-crayon-button-color`
- `--magic-crayon-button-disabled-bg`
- `--magic-crayon-button-disabled-border`
- `--magic-crayon-tool-active-bg`
- `--magic-crayon-tool-active-border`
- `--magic-crayon-clear-color`
- `--magic-crayon-clear-bg`

#### Inputs and Swatches

- `--magic-crayon-width-label-color`
- `--magic-crayon-swatch-selected`
- `--magic-crayon-swatch-border`

### Theming Recipes

#### Dark Theme

```css
magic-crayon {
  --magic-crayon-font-family: Inter, system-ui, sans-serif;
  --magic-crayon-controls-bg: #111827;
  --magic-crayon-panel-bg-open: #0f172a;
  --magic-crayon-boundary-color: #374151;
  --magic-crayon-boundary-bg: #1f2937;
  --magic-crayon-canvas-bg: #ffffff;
  --magic-crayon-button-bg: #2563eb;
  --magic-crayon-button-border: #2563eb;
  --magic-crayon-button-color: #ffffff;
  --magic-crayon-button-disabled-bg: #4b5563;
  --magic-crayon-button-disabled-border: #4b5563;
  --magic-crayon-tool-active-bg: #0ea5e9;
  --magic-crayon-tool-active-border: #0ea5e9;
  --magic-crayon-clear-color: #f87171;
  --magic-crayon-clear-bg: #111827;
  --magic-crayon-width-label-color: #e5e7eb;
  --magic-crayon-swatch-selected: #93c5fd;
  --magic-crayon-swatch-border: #475569;
}
```

#### High Contrast Theme

```css
magic-crayon {
  --magic-crayon-font-family: system-ui, sans-serif;
  --magic-crayon-controls-bg: #000000;
  --magic-crayon-panel-bg-open: #000000;
  --magic-crayon-boundary-color: #ffffff;
  --magic-crayon-boundary-bg: #000000;
  --magic-crayon-canvas-bg: #ffffff;
  --magic-crayon-button-bg: #000000;
  --magic-crayon-button-border: #ffffff;
  --magic-crayon-button-color: #ffffff;
  --magic-crayon-button-disabled-bg: #333333;
  --magic-crayon-button-disabled-border: #999999;
  --magic-crayon-tool-active-bg: #ffffff;
  --magic-crayon-tool-active-border: #ffffff;
  --magic-crayon-clear-color: #ff4d4d;
  --magic-crayon-clear-bg: #000000;
  --magic-crayon-width-label-color: #ffffff;
  --magic-crayon-swatch-selected: #ffffff;
  --magic-crayon-swatch-border: #ffffff;
}
```

#### Brand Theme (Minimal)

```css
magic-crayon.brand {
  --magic-crayon-font-family: 'Avenir Next', system-ui, sans-serif;
  --magic-crayon-button-bg: #5b21b6;
  --magic-crayon-button-border: #5b21b6;
  --magic-crayon-tool-active-bg: #111827;
  --magic-crayon-tool-active-border: #111827;
  --magic-crayon-swatch-selected: #5b21b6;
}
```

### Recommendations

- Start with the minimal token set: font, button colors, controls background,
  selected swatch.
- Use `control-style="icon"` when text labels are too dense for compact layouts.
- For cursor customization, use `draw-cursor` and `erase-cursor` with valid CSS
  cursor values (including `url(...) x y, auto` if desired).
- Prefer theme classes on the host element (for example `magic-crayon.dark`) over
  deep selectors.
- If you need fully custom width controls logic/UI, use `slot="width-controls"`.

All events bubble and are composed.

## TypeScript

Type declarations are published with the package and mapped via `exports`.

## Development

For local development, build, testing, and Storybook workflows, see [docs/development.md](docs/development.md).
