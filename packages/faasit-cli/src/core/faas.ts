import { z } from 'zod'

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
