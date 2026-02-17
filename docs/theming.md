# Theming `magic-crayon`

`magic-crayon` exposes CSS custom properties (`--magic-crayon-*`) as its component-level design tokens.

## Consumer Theming Contract

Treat CSS variables as the stable styling API for integration.

- Prefer overriding `--magic-crayon-*` variables on the host `magic-crayon` element.
- Avoid depending on internal Shadow DOM class names for long-term styling.
- Use `slot="width-controls"` only when you need to replace width-controls markup/behavior.
- Keep contrast accessible (especially button foreground/background and disabled states).

The component keeps behavior APIs (attributes/properties/events) separate from visual APIs (tokens), so you can rebrand without changing runtime integration.

## Theme Tokens

### Typography

- `--magic-crayon-font-family`

### Surfaces and Layout

- `--magic-crayon-controls-bg`
- `--magic-crayon-panel-bg-open`
- `--magic-crayon-boundary-color`
- `--magic-crayon-boundary-bg`
- `--magic-crayon-canvas-bg`

### Buttons and Actions

- `--magic-crayon-button-bg`
- `--magic-crayon-button-border`
- `--magic-crayon-button-color`
- `--magic-crayon-button-disabled-bg`
- `--magic-crayon-button-disabled-border`
- `--magic-crayon-tool-active-bg`
- `--magic-crayon-tool-active-border`
- `--magic-crayon-clear-color`
- `--magic-crayon-clear-bg`

### Inputs and Swatches

- `--magic-crayon-width-label-color`
- `--magic-crayon-swatch-selected`
- `--magic-crayon-swatch-border`

## Design System Mapping

If your app already has semantic tokens (for example `--color-surface`, `--color-primary`), map them into `magic-crayon` tokens at integration boundaries.

### Example Mapping

- **Surface**
  - `--magic-crayon-controls-bg`
  - `--magic-crayon-panel-bg-open`
  - `--magic-crayon-boundary-bg`
  - `--magic-crayon-canvas-bg`
- **Border**
  - `--magic-crayon-boundary-color`
  - `--magic-crayon-swatch-border`
- **Primary**
  - `--magic-crayon-button-bg`
  - `--magic-crayon-button-border`
  - `--magic-crayon-tool-active-bg`
  - `--magic-crayon-tool-active-border`
  - `--magic-crayon-swatch-selected`
- **Text / On Primary**
  - `--magic-crayon-button-color`
  - `--magic-crayon-width-label-color`
- **Danger**
  - `--magic-crayon-clear-color`
  - `--magic-crayon-clear-bg`
- **Disabled**
  - `--magic-crayon-button-disabled-bg`
  - `--magic-crayon-button-disabled-border`
- **Typography**
  - `--magic-crayon-font-family`

### Integration Snippet

```css
:root {
  --ds-surface: #0f172a;
  --ds-surface-2: #111827;
  --ds-border: #334155;
  --ds-primary: #2563eb;
  --ds-on-primary: #ffffff;
  --ds-danger: #ef4444;
  --ds-disabled: #475569;
  --ds-text: #e2e8f0;
  --ds-font-sans: Inter, system-ui, sans-serif;
}

magic-crayon {
  --magic-crayon-font-family: var(--ds-font-sans);
  --magic-crayon-controls-bg: var(--ds-surface);
  --magic-crayon-panel-bg-open: var(--ds-surface-2);
  --magic-crayon-boundary-color: var(--ds-border);
  --magic-crayon-boundary-bg: var(--ds-surface);

  --magic-crayon-button-bg: var(--ds-primary);
  --magic-crayon-button-border: var(--ds-primary);
  --magic-crayon-button-color: var(--ds-on-primary);
  --magic-crayon-tool-active-bg: var(--ds-primary);
  --magic-crayon-tool-active-border: var(--ds-primary);

  --magic-crayon-width-label-color: var(--ds-text);
  --magic-crayon-swatch-selected: var(--ds-primary);
  --magic-crayon-swatch-border: var(--ds-border);

  --magic-crayon-clear-color: var(--ds-danger);
  --magic-crayon-button-disabled-bg: var(--ds-disabled);
  --magic-crayon-button-disabled-border: var(--ds-disabled);
}
```

## Theming Recipes

### Dark Theme

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

### High Contrast Theme

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

### Brand Theme (Minimal)

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

## Recommendations

- Start with a minimal token set: font, controls background, button colors, selected swatch.
- Prefer host theme classes (for example `magic-crayon.dark`) over deep selectors.
- Use `control-style="icon"` when action labels are too dense for compact layouts.
- Use `draw-cursor` and `erase-cursor` for cursor customization (supports valid CSS cursor values, including URL cursors).
- Use `slot="width-controls"` when you need custom width control behavior/markup, not just color/typography changes.
