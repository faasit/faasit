import { z } from 'zod'

// Result like Rust
export type CoreError = { code: string, detail: unknown }
export type CoreResult<T> = {
  ok: true
  value: T
  error?: undefined
} | {
  ok: false
  value?: undefined
  error: CoreError
}

export class UnknownProvider extends Error {
  constructor(provider: string) {
    super(`unknown provider=${provider}`)
  }
}

// Config for each function container
// Passed by environment variables
export const FunctionContainerConfigSchema = z.object({
  funcName: z.string(),
  provider: z.union([
    z.literal('local'),
    z.literal('aliyun'),
    z.literal('knative'),
    z.literal('aws'),
    z.literal('local-once'),
  ]),
  workflow: z.object({
    funcName: z.string().default('')
  })
})

export type FunctionContainerConfig = z.infer<typeof FunctionContainerConfigSchema>

export function getFunctionContainerConfig() {
  const env = process.env

  const config: Partial<FunctionContainerConfig> = {
    funcName: env.FAASIT_FUNC_NAME,
    provider: env.FAASIT_PROVIDER as FunctionContainerConfig['provider'],
    workflow: {
      funcName: env.FAASIT_WORKFLOW_FUNC_NAME || '',
    }
  }

  return FunctionContainerConfigSchema.parse(config)
}