import { FaasitRuntime } from "./FaasitRuntime";
import { WorkflowFunc } from "./Workflow"

// Run function in a local and unit scope
export class LocalOnceRuntime implements FaasitRuntime {
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
  async call(fnName: string, fnParams: { sequence?: number | undefined; input: object; }): Promise<object> {
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
}