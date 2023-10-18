import { LocalRuntime } from "./LocalRuntime";
import { KnativeRuntime } from "./KnativeRuntime";
import { AliyunRuntime } from "./AliyunRuntime";
import { FaasitRuntime } from "./FaasitRuntime";

type fnType = (frt: FaasitRuntime) => any

export function createFunction(fn: fnType) {
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

export function createExports(fn: fnType) {
  switch (process.env.FASSIT_PROVIDER) {
    case 'local':
      return {
        handler: fn
      }
    case 'aliyun':
      return {
        handler: fn
      }
    case 'knative':
      return {
        handle: fn
      }

  }
}