import { z } from 'zod'

export class UnknownProvider extends Error {
  constructor(provider: string) {
    super(`unknown provider=${provider}`)
  }
}

// Config for each function container
// Passed by environment variables
export const FunctionContainerConfigSchema = z.object({
  provider: z.union([
    z.literal('local'),
    z.literal('aliyun'),
    z.literal('knative'),
    z.literal('local-once'),
  ]),
  workflow: z.object({
    funcType: z.string().default(''),
    funcName: z.string().default('')
  })
})

export type FunctionContainerConfig = z.infer<typeof FunctionContainerConfigSchema>

export function getFunctionContainerConfig() {
  const env = process.env

  const config: Partial<FunctionContainerConfig> = {
    provider: env.FAASIT_PROVIDER as FunctionContainerConfig['provider'],
    workflow: {
      funcType: env.FAASIT_WORKFLOW_FUNC_TYPE || '',
      funcName: env.FAASIT_WORKFLOW_FUNC_NAME || '',
    }
  }

  return FunctionContainerConfigSchema.parse(config)
}