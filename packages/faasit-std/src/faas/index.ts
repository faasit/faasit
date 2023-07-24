import { ir } from '@faasit/core'
import { z } from 'zod'

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

export const EventSchema = z.object({
  type: z.string(),
  data: ir.types.ObjectValueSchema,
})

export type Event = z.infer<typeof EventSchema>;

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
  events: z.array(EventSchema),
})

const ApplicationSchema = z.object({
  defaultProvider: z.object({
    kind: z.string(),
    name: z.string(),
  }),
  functions: z.array(FunctionSchema),
})

export type Application = z.infer<typeof ApplicationSchema>
export type FunctionType = z.infer<typeof FunctionSchema>
export type FunctionTrigger = z.infer<typeof FunctionTriggerSchema>

export function parseApplication(o: unknown): Application {
  return ApplicationSchema.parse(o)
}

export async function resolveApplicationFromIr(opts: {
  ir: ir.Spec
}): Promise<Application> {
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

export type Message = {
  message: ir.types.Value
}

export type Channel = {
  topic: string
  pub: Message
  sub: Message
}

export const ChannelSchema: z.ZodType<Channel> = z.object({
  topic: z.string(),
  pub: z.object({
    message: ir.types.ValueSchema,
  }),
  sub: z.object({
    message: ir.types.ValueSchema,
  }),
})
