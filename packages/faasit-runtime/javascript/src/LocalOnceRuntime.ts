import { BaseFaasitRuntime, CallParams, CallResult, FaasitRuntime, TellParams, TellResult } from "./FaasitRuntime";
import { WorkflowFunc } from "./Workflow"
import { LowLevelDurableClient } from "./durable";

// Run function in a local and unit scope
export class LocalOnceRuntime extends BaseFaasitRuntime {

  name: string = "local-once";

  funcMap: Map<string, WorkflowFunc> = new Map()
  constructor(private funcs: WorkflowFunc[], private inputData: object) {
    super()
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

  async call(fnName: string, fnParams: CallParams): Promise<CallResult> {
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

  async tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
    const func = this.funcMap.get(fnName)
    if (!func) {
      throw new Error(`unknown function to tell, name=${fnName}`)
    }

    console.log(`function told, name=${fnName}`)

    const frt = new LocalOnceRuntime(this.funcs, fnParams.input)

    // create task but no wait
    const task = async () => {
      const data = await func.handler(frt)
    }
    task()

    // return directly
    return {}
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

class LocalOnceDurableClient implements LowLevelDurableClient {
  static stores: Map<string, unknown> = new Map()
  private stores = LocalOnceDurableClient.stores

  async set(key: string, value: unknown): Promise<void> {
    console.log(`[Trace] LocalOnceDurableClient set key = ${key}, value =`, value)
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
