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

class LocalOnceProvider implements faas.ProviderPlugin {
  name: string = "local-once"

  async deploy(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
    const { app, provider } = input
    const onceProvider = LocalOnceProviderSchema.parse(
      provider
    )
    const inputData = onceProvider.output.input.value

    const workflowRef = app.output.workflow
    if (workflowRef) {
      await this.runWorkflow(ctx, inputData, workflowRef.value)
      return
    }

    const func = app.output.functions[0]
    if (!func) {
      throw new Error(`no functions provided`)
    }

    await this.runFunction(ctx, inputData, func.value)
  }

  async invoke(input: faas.ProviderInvokeInput, ctx: faas.ProviderPluginContext) {
    throw new Error('not implemented');
  }

  // helpers
  async runWorkflow(ctx: faas.ProviderPluginContext, inputData: unknown, workflowBlk: faas.Workflow) {
    const { logger } = ctx
    const workflow = workflowBlk.output
    assert(workflow.runtime === 'nodejs')

    logger.info(`running workflow locally, use input=${JSON.stringify(inputData)}`)
    const output = await this.executeJsCode(ctx, 'executor', 'executor', workflow.codeDir, inputData)
    logger.info(`workflow executed, output=${JSON.stringify(output)}`)
  }

  async runFunction(ctx: faas.ProviderPluginContext, inputData: unknown, fn: faas.Function) {
    const { logger } = ctx

    logger.info(`run function locally, use input=${JSON.stringify(inputData)}`)
    const output = await this.executeJsCode(ctx, 'func', fn.$ir.name, fn.output.codeDir, inputData)
    logger.info(`function executed, output=${JSON.stringify(output)}`)

  }

  async executeJsCode(ctx: faas.ProviderPluginContext, type: string, name: string, codeDir: string, inputData: unknown) {
    process.env.FAASIT_PROVIDER = 'local-once'
    process.env.FAASIT_WORKFLOW_FUNC_TYPE = type
    process.env.FAASIT_WORKFLOW_FUNC_NAME = name

    const dir = path.resolve(process.cwd(), codeDir)
    let moduleId = dir

    // if index.mjs exists
    if (await ctx.rt.fileExists(path.resolve(dir, 'index.mjs'))) {
      moduleId = path.resolve(dir, 'index.mjs')
    } else {
      moduleId = path.resolve(dir, 'index.js')
    }

    const code = await import(moduleId)
    const output = await code.default.handler(inputData)
    return output
  }
}

export default function LocalOncePlugin(): faas.ProviderPlugin {
  return new LocalOnceProvider()
}