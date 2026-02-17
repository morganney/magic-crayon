# Command-History Migration for Smart Resize Undo/Redo

Use this as the implementation brief for migrating `magic-crayon` from raster-snapshot undo/redo to a command-history approach while preserving backward compatibility.

## Objective

Implement a command-history drawing model that supports:

1. Smart undo/redo across viewport size changes.
2. Cross-device save/load (desktop ↔ phone) with reliable rendering.
3. Backward compatibility with current image-based APIs.

Keep changes incremental and non-breaking to existing user-facing behavior.

## Current Constraints

- Project uses TypeScript (strict), ESM, Vite, Vitest browser mode.
- Avoid TypeScript assertions where possible; prefer type predicates/guards.
- Preserve existing public APIs and event contracts unless explicitly noted.
- Keep implementation framework-agnostic and browser-native.

## Existing Public API (must continue to work)

- `getDrawingData(serialization?: 'blob' | 'dataurl')`
- `setDrawingData(data: Blob | string)`
- `clearDrawingData()`
- `save` event payload fields currently used by consumers

## Migration Strategy (Phased)

### Phase 1 — Internal Command Model (No Public API Changes)

Add an internal document model in `context2d`:

- `DrawingDocumentV1`
  - `version: 1`
  - `strokes: StrokeCommand[]`
  - optional metadata (`baseAspectRatio`, timestamp, etc.)
- `StrokeCommand`
  - `mode: 'draw' | 'erase'`
  - style (`color`, `lineWidth`, `lineCap`, `lineJoin`)
  - `points: Array<{ xNorm: number; yNorm: number; t?: number }>`

Normalize coordinates to viewport space:

- `xNorm = x / viewWidth`
- `yNorm = y / viewHeight`

Maintain undo/redo as command-stack operations, not canvas snapshots.

### Phase 2 — Rendering Pipeline

Implement deterministic redraw:

- Add `renderFromCommands(width, height)`.
- On `rescale()`, redraw from active command list.
- On `applyUndo()` / `applyRedo()`, update command stack and redraw.
- Keep current visible behavior for tools and compositing modes.

### Phase 3 — Compatibility Layer

Keep image APIs intact:

- `getDrawingData` still exports bitmap (`Blob` or `dataurl`).
- `setDrawingData` still accepts bitmap and renders into current viewport.

Add non-breaking structured APIs (optional additive):

- `getDrawingDocument(): DrawingDocumentV1`
- `setDrawingDocument(doc: DrawingDocumentV1): void`

If additive APIs are postponed, at least keep internal model designed for later exposure.

### Phase 4 — Save Payload Extension (Optional Additive)

Extend `save` event detail with optional field:

- `document?: DrawingDocumentV1`

Do not remove or rename existing fields. Keep consumer compatibility.

### Phase 5 — Docs + Tests

- Add docs for smart resize behavior and cross-device persistence options.
- Add migration notes for consumers wanting semantic history persistence.

## Acceptance Criteria

1. Undo/redo after resize keeps stroke alignment relative to all other strokes.
2. Draw → undo → resize → redo yields deterministic placement.
3. Existing bitmap save/load flows continue to work unchanged.
4. No breaking changes to existing public method signatures/events.
5. Tests cover command replay across at least two viewport sizes.
6. Width controls fidelity: when `stroke-width` and `eraser-scale` are configured,
   undo of erased content restores original drawn stroke geometry/width instead of
   replaying erase-width artifacts.

## Test Plan

Add/extend tests under `test/` for:

- draw → resize → undo → redo ordering
- clear + resize persistence
- erase stroke replay after resize
- erase undo fidelity when `eraser-scale` is greater than `1`
- bitmap-only import compatibility
- document export/import (if added)

Run:

```bash
npm test
npm run check-types
npm run lint
```

## Performance and Jank Considerations

Command replay introduces redraw cost. Mitigate to avoid frame drops/jank:

1. **Throttle expensive redraw paths**
   - Coalesce resize events with `requestAnimationFrame`.
   - Avoid full replay on every pointer move.

2. **Segment strategy**
   - Store strokes as compact point arrays.
   - Consider point simplification (e.g., min-distance threshold) during recording.

3. **Incremental rendering**
   - During active draw: render incrementally (single stroke path updates).
   - On undo/redo/resize: replay full active command list.

4. **Optional cache for scale jumps**
   - Keep a temporary raster cache for current viewport to reduce repeated full replays.
   - Invalidate cache when command stack mutates.

5. **Memory bounds**
   - Maintain bounded history depth (existing stack behavior) or configurable cap.
   - Guard against unbounded point growth for long sessions.

6. **Performance guardrails**
   - Add lightweight instrumentation hooks or debug timers around replay.
   - Confirm no visible hitching in common scenarios (mobile resize/orientation, desktop split-pane).

## Non-Goals (for initial migration)

- Rich vector editing tools (selection/transform/anchor editing).
- Full SVG authoring/export as primary persistence format.
- CRDT/collaborative editing.

## Implementation Notes

- Keep the smallest possible surface-area changes per phase.
- Prefer pure helpers for coordinate normalization and replay.
- Preserve behavior of eraser compositing (`destination-out`) during command replay.
- If introducing new types, version them (`V1`) to allow future migrations.

## Deliverables

1. Command model + replay implementation in runtime.
2. Backward-compatible bitmap API behavior preserved.
3. Regression tests for resize-aware undo/redo.
4. Documentation updates for developers and API consumers.
