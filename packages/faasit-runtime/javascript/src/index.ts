import { LocalRuntime } from "./LocalRuntime";
import { KnativeRuntime } from "./KnativeRuntime";
import { AliyunRuntime } from "./AliyunRuntime";
import { FaasitRuntime } from "./FaasitRuntime";
import { WorkflowBuilder, WorkflowSpec } from './Workflow'

export type { FaasitRuntime };

type HandlerType = (frt: FaasitRuntime) => any

type WorkflowBuilderType = (builder: WorkflowBuilder) => WorkflowSpec

export function createWorkflow(fn: WorkflowBuilderType): WorkflowSpec {
  // TODO: create builder
  const builder: WorkflowBuilder = undefined as any
  return fn(builder)
}

export function createFunction(fn: HandlerType) {
  switch (process.env.FASSIT_PROVIDER) {
    case 'local':
      return (event: any) => {
        const runtime = new LocalRuntime(event)
        return fn(runtime)
      }
    case 'aliyun':
      return (event: any, context: any, callback: any) => {
        const runtime = new AliyunRuntime(event, context, callback)
        return fn(runtime)
      }
    case 'knative':
      // TODO
      return (context: any, event: any) => {
        const runtime = new KnativeRuntime(context, event)
        return fn(runtime)
      }
  }
}

export function createExports(conf: { handler: HandlerType } | { workflow: WorkflowSpec }) {
  return conf
}
