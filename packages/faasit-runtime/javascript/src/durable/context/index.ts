import { DurableCallbackContext } from "./DurableCallbackContext"

export function parseDurableCallbackContext(ctx: unknown): DurableCallbackContext | undefined {
  if (typeof ctx !== 'object' || ctx == null) {
    return undefined
  }

  if ((ctx as DurableCallbackContext)['kind'] !== 'durable-orchestrator-callback') {
    return undefined
  }

  return ctx as DurableCallbackContext
}