import { BaseFaasitRuntime, InputType, CallParams, CallResult, FaasitRuntime, TellParams, TellResult, FaasitRuntimeMetadata } from "./FaasitRuntime";
import { WorkflowFunc } from "./Workflow"
import { LowLevelDurableClient, IsDurableOrchestratorFlag, waitOrchestratorResult } from "./durable";

// Run function in a local and unit scope
export class LocalOnceRuntime extends BaseFaasitRuntime {

  name: string = "local-once";

  funcMap: Map<string, WorkflowFunc> = new Map()
  constructor(private funcs: WorkflowFunc[], private data: { input: InputType, metadata: FaasitRuntimeMetadata }) {
    super()
    for (const func of funcs) {
      this.funcMap.set(func.name, func)
    }
  }

  metadata(): FaasitRuntimeMetadata {
    return this.data.metadata
  }

  input(): InputType {
    return this.data.input
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

    const metadata = this.helperCollectMetadata('call', fnName, fnParams)
    // call locally and recusively
    const frt = new LocalOnceRuntime(this.funcs, { input: fnParams.input, metadata })
    const data = await func.handler(frt)

    // polling and wait for result
    if (data instanceof IsDurableOrchestratorFlag) {
      const result = await waitOrchestratorResult(frt, data.orchestratorId, {})
      return { output: result }
    }

    return { output: data }
  }

  async tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
    const func = this.funcMap.get(fnName)
    if (!func) {
      throw new Error(`unknown function to tell, name=${fnName}`)
    }

    console.log(`function tell, name=${fnName}, responseCtx=${!!fnParams.responseCtx}`)

    const metadata = this.helperCollectMetadata('tell', fnName, fnParams)
    const frt = new LocalOnceRuntime(this.funcs, { input: fnParams.input, metadata })

    // create task but no wait
    const task = async () => {
      await func.handler(frt)
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
