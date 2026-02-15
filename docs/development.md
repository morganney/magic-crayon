# Development

This guide covers local development workflows for `magic-crayon` contributors.

## Prerequisites

- Node.js (project uses modern ESM tooling)
- npm

Install dependencies from the repository root:

```bash
npm install
```

## Local Development

Run the demo app in development mode:

```bash
npm run dev
```

## Build

Library build (for npm packaging):

```bash
npm run build
```

Demo build:

```bash
npm run build:demo
npm run preview
```

## Testing

Run the test suite:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Note: Vitest browser mode is optimized for test execution and reports; use `npm run dev` or Storybook for visual/manual interaction checks.

## Storybook

Run Storybook locally:

```bash
npm run storybook
```

Build static Storybook output:

```bash
npm run build-storybook
```

## Quality Checks

Typecheck:

```bash
npm run check-types
```

Lint:

```bash
npm run lint
```
