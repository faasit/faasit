import { ir } from "@faasit/core";
import { faas } from "@faasit/std";
import assert from "assert";
import path from "path";
import { z } from "zod";

export const LocalOnceProviderSchema = ir.types.CustomBlockSchemaT(z.object({
  kind: z.literal('local-once'),
  input: z.object({
    value: z.unknown()
  }),
}))

export default function LocalOncePlugin(): faas.ProviderPlugin {
  return {
    name: 'local-once',
    async deploy(input, ctx) {
      const { rt, logger } = ctx
      const { app, provider } = input


      const onceProvider = LocalOnceProviderSchema.parse(
        provider
      )
      const inputData = onceProvider.output.input.value

      const runWorkflow = async () => {
        const workflow = app.output.workflow!.value.output
        assert(workflow.runtime === 'nodejs')

        logger.info(`running workflow locally, use input=${JSON.stringify(inputData)}`)
        process.env.FAASIT_PROVIDER = 'local-once'
        process.env.FAASIT_WORKFLOW_FUNC_TYPE = 'executor'

        const dir = path.resolve(process.cwd(), workflow.codeDir, `index.mjs`)
        const code = await import(dir)
        const output = await code.default.handler(inputData)

        logger.info(`workflow executed, output=${JSON.stringify(output)}`)
      }

      const workflowRef = app.output.workflow
      if (workflowRef) {
        await runWorkflow()
        return
      }

      // run first functions
      const func = app.output.functions[0]
      if (!func) {
        throw new Error(`no functions provided`)
      }

      throw new Error(`not implemented for non-workflow`)
    },
  }
}