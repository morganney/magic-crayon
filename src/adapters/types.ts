import type { MagicCrayonCommandV1 } from '../command-api.js'

type AdapterParseSuccess = {
  ok: true
  commands: MagicCrayonCommandV1[]
}

type AdapterParseFailure = {
  ok: false
  reason: string
}

type AdapterParseResult = AdapterParseSuccess | AdapterParseFailure

type MagicCrayonVendorAdapter = {
  vendor: 'ai-sdk' | 'copilotkit'
  parse(input: unknown): AdapterParseResult
}

export type {
  AdapterParseFailure,
  AdapterParseResult,
  AdapterParseSuccess,
  MagicCrayonVendorAdapter,
}
