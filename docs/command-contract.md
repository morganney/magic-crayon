# Public Command API (v1 Contract)

This document defines the agent-agnostic command contract for `magic-crayon`.

## Scope

The contract defines standard edit actions against a drawing surface.

- It is transport-agnostic and framework-agnostic.
- It does not prescribe prompt strategy or image style decisions.
- It is intended for preview-and-apply workflows.

## Coordinate System

Commands use normalized canvas coordinates to support cross-device replay.

- `x` and `y` are percentages in the range `0..100`.
- Rectangles use the same normalized percentage space.

## Versioning

- Contract version: `1`
- TypeScript contract types: `MagicCrayonCommandV1`, `CommandExecutionResultV1`, `CommandBatchResultV1`, `CommandApiStateV1`
- Canonical command definitions live in `src/command/types.ts`.

## Commands (v1)

This document intentionally does not duplicate the full command union.

- Source of truth for command kinds and payload shapes: `MagicCrayonCommandV1` in `src/command/types.ts`.
- This avoids docs drift when command types evolve.
- This page documents only cross-cutting contract guarantees and runtime semantics.

## Execution Result

Each command execution returns:

- `version`
- `status`: `applied | rejected | noop`
- `command`
- optional `reason`

Batch execution returns an ordered list of per-command results.

## State Snapshot

State reads return:

- `version`
- `undoSize`
- `redoSize`
- `document` (`DrawingDocumentV1`)

## Preview Workflow

Recommended host flow:

1. Generate a candidate command list from an agent.
2. Apply list to a temporary pad for preview.
3. Show before/after to user.
4. On approval, apply same command list to live pad.
5. On rejection, discard preview state.

## Stability Notes

- This document finalizes the v1 contract shape.
- Runtime helper entry points are available in code as `executeCommandV1`,
  `executeCommandBatchV1`, `getCommandApiStateV1`, and
  `createContext2DCommandRuntime`.
- Package import path for command types: `magic-crayon/command/types`.
- Package import path for runtime helpers: `magic-crayon/command/runtime`.
- Adapter-specific gaps are surfaced as `rejected` results with reason text
  (for example, `erase-rect` requires adapter support).
