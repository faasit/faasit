import { LocalRuntime } from "./runtime/LocalRuntime";
import { KnativeRuntime } from "./runtime/KnativeRuntime";

import { FaasitRuntime, createFaasitRuntimeMetadata } from "./runtime/FaasitRuntime";
import { WorkflowContainerRunner, WorkflowSpec } from './Workflow'
import { FunctionContainerConfig, UnknownProvider, getFunctionContainerConfig } from "./type";
import { LocalOnceRuntime } from "./runtime/LocalOnceRuntime";
export { createWorkflow } from './Workflow'

import * as utils from './utils'
import { AwsRuntime } from "./runtime/AwsRuntime";

export * as TccTxn from "./txn/TccTxn"
export * as SagaTxn from "./txn/SagaTxn"
export * as df from "./durable"
export * as operators from "./operators"

export type { FaasitRuntime };

export type HandlerType = (frt: FaasitRuntime) => any

export function createExports(obj: { handler: HandlerType } | { workflow: WorkflowSpec }) {
  const containerConf = getFunctionContainerConfig()

  if ("handler" in obj) {
    const handler = transformFunction(obj.handler)
    return transformHandlerExports(containerConf, { handler })
  }

  if ("workflow" in obj) {
    const runner = new WorkflowContainerRunner(containerConf, obj.workflow)

    const executorFunc = transformWorkflowFunction(
      containerConf,
      obj.workflow,
      (frt) => {
        return runner.run(frt)
      },
    )

    return transformHandlerExports(containerConf, { handler: executorFunc })
  }

  return obj
}

export function createFunction(fn: HandlerType): HandlerType {

  return async (frt) => {
    const result = await fn(frt)
    await utils.handlePostCallback(frt, {
      result
    })

    return result
  }
}

function transformFunction(fn: HandlerType) {
  // container config is injected by different provider plugins
  const containerConf = getFunctionContainerConfig()

  const metadata = createFaasitRuntimeMetadata({
    funcName: containerConf.funcName
  })

  switch (containerConf.provider) {
    case 'local':
      return (event: any) => {
        const runtime = new LocalRuntime(event)
        return fn(runtime)
      }
    case 'local-once':
      return (event: any) => {
        const runtime = new LocalOnceRuntime([], {
          input: event,
          metadata
        })
        return fn(runtime)
      }
    case 'aliyun':
      return async (arg0: any, arg1: any, arg2: any) => {
        const  { AliyunEventRuntime, AliyunHttpRuntime } = await import("./runtime/AliyunRuntime");
        let runtime: FaasitRuntime
        if (arg2 instanceof Function) {
          runtime = new AliyunEventRuntime({ event: arg0, context: arg1, callback: arg2, metadata })
        } else {
          runtime = new AliyunHttpRuntime({ req: arg0, resp: arg1, context: arg2, metadata })
        }

        return fn(runtime)
      }
    case 'knative':
      return (event: any, context: any) => {
        const runtime = new KnativeRuntime({ context, event, metadata })
        return fn(runtime)
      }
    case 'aws':
      return (event: any) => {
        const runtime = new AwsRuntime({ event, metadata })
        return fn(runtime)
      }
    default:
      throw new UnknownProvider(containerConf.provider)
  }
}

function transformWorkflowFunction(containerConf: FunctionContainerConfig, spec: WorkflowSpec, fn: HandlerType) {
  switch (containerConf.provider) {
    case 'local-once':
      const metadata = createFaasitRuntimeMetadata({ funcName: containerConf.funcName })
      return (event: any) => {
        const functions = spec.functions
        // TODO: special handling for executor
        functions.push({ name: '__executor', handler: spec.exeuctor.handler })
        const runtime = new LocalOnceRuntime(spec.functions, { input: event, metadata })
        return fn(runtime)
      }
    case 'local':
    case 'aliyun':
    case 'knative':
    case 'aws':
      return transformFunction(fn)
    default:
      throw new UnknownProvider(containerConf.provider)
  }
}

export type PlatformDependentExports = { handler: unknown } | { handle: unknown }

function transformHandlerExports(conf: FunctionContainerConfig, obj: { handler: unknown }): PlatformDependentExports {
  switch (conf.provider) {
    case 'local':
    case 'local-once':
    case 'aliyun':
    case 'aws':
    case 'knative':
      return obj
    default:
      throw new UnknownProvider(conf.provider)
  }
}

