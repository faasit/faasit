import { z } from 'zod'
import { ir } from '@faasit/core'

import { runtime } from '@faasit/core'

export interface ProviderPluginContext {
  rt: runtime.PluginRuntime
  logger: runtime.PluginLogger
}

export interface ProviderPlugin {
  name: string

  deploy?: (
    input: {
      app: Application
    },
    ctx: ProviderPluginContext
  ) => Promise<void>

  invoke?: (
    input: {
      app: Application
      funcName: string
    },
    ctx: ProviderPluginContext
  ) => Promise<void>
}

const FunctionTriggerSchema = z.object({
  name: z.string(),
  kind: z.string(),
})

const FunctionSchema = z.object({
  name: z.string(),
  runtime: z.string(),
  codeDir: z.string(),
  handler: z.string().optional(),
  resource: z.object({
    cpu: z.string(),
    memory: z.string(),
  }),
  triggers: z.array(FunctionTriggerSchema),
})

const ApplicationSchema = z.object({
  defaultProvider: z.object({
    name: z.string(),
  }),
  functions: z.array(FunctionSchema),
})

export type Application = z.infer<typeof ApplicationSchema>

export function parseApplication(o: unknown): Application {
  return ApplicationSchema.parse(o)
}

export async function resolveApplicationFromIr(opts: { ir: ir.Spec }): Promise<Application> {
  const irService = ir.makeIrService(opts.ir)

  const applicationBlock = opts.ir.modules[0].blocks.find(
    (b) => ir.types.isCustomBlock(b) && b.block_type === 'application'
  ) as ir.types.CustomBlock

  if (!applicationBlock) {
    throw new Error(`no @application block`)
  }

  const value = irService.convertToValue(applicationBlock)
  return parseApplication(value)
}
