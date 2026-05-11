# Adapter Packaging Migration Plan

This document defines a migration away from shipping vendor adapters inside the core `magic-crayon` package.

## Goal

Keep `magic-crayon` focused on browser-native drawing behavior and the command contract, while moving vendor-specific agent integrations to companion packages.

## Why

- Reduce coupling between UI/runtime releases and vendor API drift.
- Keep the core package small, stable, and framework/vendor agnostic.
- Allow independent release cadence for adapter integrations.
- Make it easier for consumers to choose only the adapter surface they need.

## Recommended Ownership Boundary

Core `magic-crayon` package should own:

- `magic-crayon` element and runtime behavior.
- Command contract types (`command/types`).
- Command runtime execution (`command/runtime`).
- Vendor-agnostic parsing primitives, if any are truly generic.

Companion adapter packages should own:

- AI SDK adapter mapping and schemas.
- CopilotKit adapter mapping and schemas.
- Vendor-specific payload normalization and naming quirks.
- Vendor-specific test fixtures and compatibility notes.

## Target Package Layout

- `magic-crayon`
  - exports:
    - `.`
    - `./command/types`
    - `./command/runtime`
    - `./defined`
- `@magic-crayon/adapter-ai-sdk`
  - exports adapter parse entry and adapter-related types.
- `@magic-crayon/adapter-copilotkit`
  - exports adapter parse entry and adapter-related types.

## Migration Phases

### Phase 1: Internal Extraction

1. Move adapter implementation source from core into new package folders/repositories.
2. Keep adapter code compiling against the public `magic-crayon/command/types` contract only.
3. Avoid direct imports from core internals that are not part of public exports.

Exit criteria:

- Companion packages build and test independently.
- Core package has no runtime dependency on vendor adapters.

### Phase 2: Publish Companion Packages

1. Publish `@magic-crayon/adapter-ai-sdk`.
2. Publish `@magic-crayon/adapter-copilotkit`.
3. Document installation and usage examples in package READMEs.

Exit criteria:

- Consumers can install adapter packages without importing adapter code from core.

### Phase 3: Core Package De-scope

1. Remove adapter exports from `magic-crayon` package exports.
2. Remove adapter source from core package.
3. Keep docs in core pointing users to companion package names.

Exit criteria:

- Core exports include only element + command/runtime surfaces.
- No adapter code ships in core dist artifacts.

### Phase 4: Cleanup and Hardening

1. Move adapter-focused tests out of core into each companion package.
2. Keep integration tests in one place to validate end-to-end command flow.
3. Track compatibility matrix by adapter package version.

Exit criteria:

- Adapter versioning and release cadence are independent from core.

## Versioning and Breaking Change Policy

Because this migration removes adapter exports from `magic-crayon`, treat the de-scope as a major release boundary unless already in a pre-1.0 compatibility window where breakage is expected.

## Consumer Migration Guide (High Level)

Before:

- Import adapters from core package subpaths.

After:

- Install companion package(s).
- Import adapters from `@magic-crayon/adapter-ai-sdk` or `@magic-crayon/adapter-copilotkit`.
- Keep command application logic unchanged against `magic-crayon/command/runtime`.

## Risks and Mitigations

Risk: Fragmented version compatibility.

- Mitigation: Publish and maintain a compatibility table in each adapter package README.

Risk: Consumer confusion during transition.

- Mitigation: Add concise migration snippets and explicit deprecation/removal notes.

Risk: Duplicate shared adapter types.

- Mitigation: Keep shared contracts in a small shared package only if needed; otherwise colocate minimal types per adapter package.

## Practical Next Step

Create companion package skeletons first, wire CI for each package, then remove adapter exports from core in one explicit release step.
