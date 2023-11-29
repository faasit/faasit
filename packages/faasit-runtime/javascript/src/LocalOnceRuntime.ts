import { CallResult, FaasitRuntime } from "./FaasitRuntime";
import { WorkflowFunc } from "./Workflow"
import { DurableClient } from "./durable";

// Run function in a local and unit scope
export class LocalOnceRuntime implements FaasitRuntime {

  name: string = "local-once";

  funcMap: Map<string, WorkflowFunc> = new Map()
  constructor(private funcs: WorkflowFunc[], private inputData: object) {
    for (const func of funcs) {
      this.funcMap.set(func.name, func)
    }
  }

  input(): object {
    return this.inputData
  }
  output(returnObject: any): object {
    return returnObject
  }
  async call(fnName: string, fnParams: { sequence?: number | undefined; input: object; }): Promise<CallResult> {
    const func = this.funcMap.get(fnName)
    if (!func) {
      throw new Error(`unknown function to call, name=${fnName}`)
    }

    console.log(`function called, name=${fnName}, seq=${fnParams.sequence || 0}`)

    // call locally and recusively
    const frt = new LocalOnceRuntime(this.funcs, fnParams.input)
    const data = await func.handler(frt)
    return { output: data }
  }

  get extendedFeatures() {
    return LocalOnceRuntime.extendedFeaturesStatic
  }

  static extendedFeaturesStatic = {
    durable: () => {
      return new LocalOnceDurableClient()
    }
  }
}

class LocalOnceDurableClient implements DurableClient {

  static stores: Map<string, unknown> = new Map()
  private stores: Map<string, unknown> = LocalOnceDurableClient.stores

  async set(key: string, value: unknown): Promise<void> {
    this.stores.set(key, value)
  }
  async get<T = unknown>(key: string, defaultFn?: (() => T) | undefined): Promise<T | undefined> {
    let value = this.stores.get(key) as T
    if (!value && defaultFn) {
      value = defaultFn()
      this.stores.set(key, value)
    }

    return value
  }
}
