# Command-History Status and Design Notes

This document tracks the command-history architecture in `magic-crayon`.

## Completed Goals

1. Resize-safe undo/redo.
2. Cross-device fidelity via source-space stroke replay.
3. Durable clear semantics so stale drawing state does not resurrect on reconnect.

## Current Constraints

- Project uses TypeScript (strict), ESM, Vite, Vitest browser mode.
- Avoid TypeScript assertions where possible; prefer type predicates/guards.
- Preserve existing public APIs and event contracts unless explicitly noted.
- Keep implementation framework-agnostic and browser-native.

## Existing Public API (still supported)

- `getDrawingData(serialization?: 'blob' | 'dataurl')`
- `setDrawingData(data: Blob | string)`
- `clearDrawingData()`
- `save` event payload fields currently used by consumers

## Internal Model

The runtime now keeps stroke commands and replays them to render output.

- `DrawingDocumentV1`
  - `version: 1`
  - `strokes: StrokeCommand[]`
- `StrokeCommand`
  - `mode: 'draw' | 'erase'`
  - style (`strokeStyle`, `lineWidth`, `lineCap`, `lineJoin`, `compositing`)
  - source viewport (`sourceWidth`, `sourceHeight`)
  - points in source space (`points: Array<{ x: number; y: number }>`)

Replay scales source-space points into the current viewport, making resize and
cross-device rendering deterministic.

## Acceptance Criteria

1. Undo/redo after resize keeps stroke alignment relative to all other strokes.
2. Draw → undo → resize → redo yields deterministic placement.
3. Existing bitmap save/load flows continue to work unchanged.
4. Clear does not resurrect stale drawing state on reconnect.
5. Tests cover replay behavior and reconnect durability.

## Test Plan

Regression tests under `test/` cover:

- draw → resize → undo → redo ordering
- clear + resize persistence
- erase replay undo/redo semantics
- bitmap-only import compatibility
- document export/import roundtrip
- clear durability across disconnect/reconnect

Run:

```bash
npm test
npm run check-types
npm run lint
```

## Performance Notes

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

## Deferred Work

- Protocol-specific adapters (AI SDK, AGUI, etc.).

## Next Step

Add protocol-specific adapters (AI SDK, AGUI, etc.) that map their command
shape into the public v1 command contract.
