---
name: PR review instructions
description: Guidance for Copilot when reviewing pull requests in magic-crayon.
applyTo: '**/*'
---

When reviewing PRs in this repository:

- Prioritize correctness, regressions, and API contract stability over stylistic nits.
- Validate claims against actual framework behavior (Vitest/Jest matcher semantics, browser APIs, TypeScript rules).
- Do not report failures that depend on exact string equality unless the test truly uses exact matching.
- For `toThrow('...')` string matchers, assume substring matching unless code uses regex anchors or explicit exact checks.
- Before flagging a test as broken, confirm whether the assertion is substring, regex, or strict equality.
- Prefer evidence-backed comments: point to the assertion type and explain why it does or does not fail.
- Focus on real risk: behavior bugs, state sync issues, resize/render regressions, undo/redo correctness, and event contract drift.
- Ensure behavior changes include or update tests under `test/`.
- Preserve public API and event payload compatibility unless the PR explicitly introduces a breaking change.
- Call out performance risks (replay loops on resize, unnecessary redraws, pointer-move hot-path work) when relevant.
- Avoid requesting broad refactors when a localized fix satisfies the issue.
- Summarize review findings by severity: blocking defects, non-blocking improvements, and optional follow-ups.
