import { ir } from '@faasit/core'
import { z } from 'zod'

import { runtime } from '@faasit/core'

export interface GeneratorPluginContext { }

export interface GenerationItem {
  path: string
  content: string
  contentType: string
}

export interface GenerationResult {
  items: GenerationItem[]
}

export interface GeneratorPlugin {
  name: string
  generate?: (
    input: { app: Application; irSpec: ir.Spec },
    ctx: GeneratorPluginContext
  ) => Promise<GenerationResult>
}

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

export const EventSchema = ir.types.CustomBlockSchemaT(z.object({
  type: z.string(),
  data: ir.types.StructLikeTypeSchema,
}))

export type Event = z.infer<typeof EventSchema>

const ProviderSchema = ir.types.CustomBlockSchemaT(z.object({
  kind: z.string(),
}))

const FunctionTriggerSchema = z.object({
  name: z.string(),
  kind: z.string(),
})

const FunctionSchema = ir.types.CustomBlockSchemaT(z.object({
  runtime: z.string(),
  codeDir: z.string(),
  handler: z.string().optional(),
  resource: z.object({
    cpu: z.string(),
    memory: z.string(),
  }).optional(),
  triggers: z.array(FunctionTriggerSchema).default(() => []),
  pubsub: z.object({
    events: z.array(ir.types.ReferenceSchemaT(EventSchema)),
  }).optional(),
  role: z.string().optional(),
}))

const ApplicationSchema = ir.types.CustomBlockSchemaT(z.object({
  name: z.string().optional(),
  defaultProvider: ir.types.ReferenceSchemaT(ProviderSchema),
  functions: z.array(ir.types.ReferenceSchemaT(FunctionSchema)),
}))

export type Application = z.infer<typeof ApplicationSchema>
export type FunctionType = z.infer<typeof FunctionSchema>
export type FunctionTrigger = z.infer<typeof FunctionTriggerSchema>

export function parseApplication(o: unknown): Application {
  return ApplicationSchema.parse(o)
}

export async function resolveApplicationFromIr(opts: {
  ir: ir.Spec
}): Promise<Application> {
  const applicationBlock = opts.ir.packages[0].blocks.find(
    (b) => ir.types.isCustomBlock(b) && b.$ir.block_type.$ir.id === 'application'
  ) as ir.types.CustomBlock

  if (!applicationBlock) {
    throw new Error(`no @application block`)
  }

  return parseApplication(applicationBlock)
}
