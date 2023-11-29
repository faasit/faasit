import { LocalRuntime } from "./LocalRuntime";
import { KnativeRuntime } from "./KnativeRuntime";
import { AliyunRuntime } from "./AliyunRuntime";
import { FaasitRuntime } from "./FaasitRuntime";
import { WorkflowContainerRunner, WorkflowSpec } from './Workflow'
import { FunctionContainerConfig, UnknownProvider, getFunctionContainerConfig } from "./type";
import { LocalOnceRuntime } from "./LocalOnceRuntime";
export { createWorkflow } from './Workflow'

export * as txn from "./txn"

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

export function createFunction(fn: HandlerType): HandlerType { return fn }


function transformFunction(fn: HandlerType) {
  const containerConf = getFunctionContainerConfig()

  switch (containerConf.provider) {
    case 'local':
      return (event: any) => {
        const runtime = new LocalRuntime(event)
        return fn(runtime)
      }
    case 'local-once':
      return (event: any) => {
        const runtime = new LocalOnceRuntime([], event)
        return fn(runtime)
      }
    case 'aliyun':
      return (event: any, context: any, callback: any) => {
        const runtime = new AliyunRuntime(event, context, callback)
        return fn(runtime)
      }
    case 'knative':
      return (context: any, event: any) => {
        const runtime = new KnativeRuntime(context, event)
        return fn(runtime)
      }
    default:
      throw new UnknownProvider(containerConf.provider)
  }
}

function transformWorkflowFunction(containerConf: FunctionContainerConfig, spec: WorkflowSpec, fn: HandlerType) {
  switch (containerConf.provider) {
    case 'local-once':
      return (event: any) => {
        const runtime = new LocalOnceRuntime(spec.functions, event)
        return fn(runtime)
      }
    case 'local':
    case 'aliyun':
    case 'knative':
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
      return obj
    case 'knative':
      return {
        handle: obj.handler
      }
    default:
      throw new UnknownProvider(conf.provider)
  }
}

