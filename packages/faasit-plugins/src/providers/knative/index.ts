import { ft_utils } from '@faasit/core'
import { faas } from '@faasit/std'
import axios from 'axios'
import yaml from 'js-yaml'

import * as plugin_utils from '../../utils'
import path from 'path'

interface DeployParams {
  ctx: faas.ProviderPluginContext
  input: faas.ProviderDeployInput
  providerDataDir: string
}

interface DeployFunctionParams {
  workflowFuncType: string
  name: string
  codeDir: string
}

class KnativeProvider implements faas.ProviderPlugin {
  name: string = 'knative'

  async deploy(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
    const providerDataDir = await plugin_utils.mkdir(path.resolve(ctx.cwd, '.ft', 'providers', this.name))
    if (faas.isWorkflowApplication(input.app)) {
      return this.deployWorkflowApp({ ctx, input, providerDataDir }, input.app)
    }
    return this.deployFunctionApp({ ctx, input, providerDataDir })
  }

  async invoke(input: faas.ProviderInvokeInput, ctx: faas.ProviderPluginContext) {
    const { rt, logger } = ctx
    const { app } = input

    logger.info(`invoke function ${input.funcName}`)

    const svcName = `${app.$ir.name}-${input.funcName}`

    const url = `http://${svcName}.faasit.192.168.1.240.sslip.io`

    const resp = await axios.get(url)

    console.log(resp.data)

    logger.info(`invoked function ${input.funcName}`)
  }

  // helpers
  async deployWorkflowApp(p: DeployParams, app: faas.WorkflowApplication) {
    const { ctx } = p
    const { logger } = ctx

    logger.info(`deploy workflow on knative`)
    const workflow = app.output.workflow.value.output

    // deploy worker functions
    const functionsToDeploy: DeployFunctionParams[] = []
    for (const fnRef of workflow.functions) {
      const fn = fnRef.value
      const codeDir = fn.output.codeDir

      functionsToDeploy.push({
        workflowFuncType: 'func',
        name: fnRef.value.$ir.name,
        // use workflow's codeDir if no codeDir provided by the function
        codeDir: codeDir || workflow.codeDir,
      })
    }

    // deploy executor function
    functionsToDeploy.push({
      workflowFuncType: 'executor',
      name: 'executor',
      codeDir: workflow.codeDir
    })

    logger.info(`deploying workflow, functions=${functionsToDeploy.length}`)
    await ft_utils.asyncPoolAll(1, functionsToDeploy, (fn) => this.deployOneFunction(p, fn))
    logger.info(`deployed workflow, functions=${functionsToDeploy.length}`)
  }

  async deployFunctionApp(p: DeployParams) {
    const { app } = p.input
    const { logger } = p.ctx

    logger.info(`deploy functions on knative`)

    const functionsToDeploy: DeployFunctionParams[] = []
    for (const fnRef of app.output.functions) {
      const fn = fnRef.value
      const codeDir = fn.output.codeDir

      if (!codeDir) {
        throw new Error(`failed to deploy function=${fn.$ir.name}, codeDir is empty`)
      }

      functionsToDeploy.push({
        workflowFuncType: 'func',
        name: fnRef.value.$ir.name,
        codeDir: codeDir
      })
    }

    await ft_utils.asyncPoolAll(4, functionsToDeploy, (fn) => this.deployOneFunction(p, fn))
  }

  async deployOneFunction(p: DeployParams, fnParams: {
    workflowFuncType: string
    name: string
    codeDir: string
  }) {
    const { rt, logger } = p.ctx

    logger.info(`  > deploy function ${fnParams.name}`)

    const imageName = `${p.input.app.$ir.name}-${fnParams.name}`.toLowerCase()
    const registry = 'reg.i2ec.top'

    const funcObj = {
      specVersion: "0.35.0",
      name: imageName,
      runtime: "node",
      registry: `${registry}/cdd1037`,
      image: `${registry}/cdd1037/${imageName}:latest`,
      build: {
        builder: "pack",
        pvcSize: "256Mi",
        builderImages: {
          // pack: "reg.i2ec.top/library/ubuntu:20.04"
          // pack: "reg.i2ec.top/knative/builder-jammy-base:latest"
          // pack: "reg.i2ec.top/knative/builder-base-1:latest"
          pack: "reg.i2ec.top/builder/i2ec-builder2:latest"
        }
      },
      run: {
        envs: [
          {
            name: "FAASIT_PROVIDER",
            value: "knative"
          },
          {
            name: "FAASIT_APP_NAME",
            value: p.input.app.$ir.name
          },
          {
            name: "FAASIT_WORKFLOW_FUNC_TYPE",
            value: fnParams.workflowFuncType
          },
          {
            name: "FAASIT_WORKFLOW_FUNC_NAME",
            value: fnParams.name
          }
        ]
      },
      deploy: {
        namespace: "faasit"
      }
    }

    const funcFile = `${fnParams.codeDir}/func.yaml`
    await rt.writeFile(funcFile, yaml.dump(funcObj))

    const proc = rt.runCommand(`kn func deploy -n faasit`, {
      cwd: fnParams.codeDir,
      shell: true,
      stdio: 'inherit'
    })

    await Promise.all([
      proc.readOut(v => logger.info(v)),
      proc.readErr(v => logger.error(v))
    ])
    await proc.wait()

    logger.info(`  > deployed function ${fnParams.name}`)
  }
}

export default function KnativePlugin(): faas.ProviderPlugin {
  return new KnativeProvider()
}
