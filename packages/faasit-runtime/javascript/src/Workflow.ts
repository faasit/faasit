import { FaasitRuntime } from "./runtime/FaasitRuntime"
import { FunctionContainerConfig } from "./type"

type HandlerType = (frt: FaasitRuntime) => unknown

type DeclarativeWorkflowBuilder = () => unknown

export interface WorkflowBuilder {
  // configure function
  func(name: string): WorkflowFuncBuilder

  // get all valid function names
  get_funcs(): string[]

  // configure executor
  executor(): WorkflowExecutorBuilder

  // finalize and output workflow spec (used by engine)
  build(): WorkflowSpec
}

export interface WorkflowFuncBuilder {
  // add handler
  set_handler(fn: HandlerType): WorkflowFuncBuilder
}

export interface WorkflowExecutorBuilder {
  // use custom executor to replace auto generated executor
  set_custom_handler(fn: HandlerType): WorkflowExecutorBuilder

  // use declarative workflow description language to describe a workflow
  // TODO: design declarative and higher level api to describe workflow
  set_declarative(): WorkflowExecutorBuilder
}

export interface WorkflowFunc {
  name: string
  handler: HandlerType
}

export interface WorkflowExecutor {
  kind: 'e_custom'
  handler: HandlerType
}

// TODO: design details for WorkflowSpec
export interface WorkflowSpec {
  functions: WorkflowFunc[]
  exeuctor: WorkflowExecutor
}

class SimpleWorkflowBuilder implements WorkflowBuilder {
  private spec: WorkflowSpec = {
    functions: [],
    exeuctor: {
      kind: 'e_custom',
      handler: () => { throw new Error(`not implemented executor`) }
    }
  }
  constructor() { }

  func(name: string): WorkflowFuncBuilder {
    if (name.startsWith('__')) {
      throw new Error(`function name can not start with __, name=${name}`)
    }

    const func: Partial<WorkflowFunc> = {
      name
    }

    this.spec.functions.push(func as WorkflowFunc)

    return {
      set_handler(fn) {
        func.handler = fn;
        return this
      },
    }
  }
  get_funcs(): string[] {
    return this.spec.functions.map(v => v.name)
  }
  executor(): WorkflowExecutorBuilder {
    const spec = this.spec
    return {
      set_custom_handler(fn) {
        spec.exeuctor.handler = fn
        return this
      },
      set_declarative() {
        throw new Error("Method not implemented.")
      },
    }
  }
  build(): WorkflowSpec {
    return this.spec
  }
}

type WorkflowBuilderType = (builder: WorkflowBuilder) => WorkflowSpec
export function createWorkflow(fn: WorkflowBuilderType): WorkflowSpec {
  const builder = new SimpleWorkflowBuilder()
  return fn(builder)
}

// Run workflow function in each container
export class WorkflowContainerRunner {
  constructor(private containerConf: FunctionContainerConfig, private spec: WorkflowSpec) {
  }

  run(frt: FaasitRuntime): unknown {
    const { funcName } = this.containerConf.workflow
    const func = this.route(funcName)
    return func(frt)
  }

  route(name: string): HandlerType {
    // run executor
    if (name === '__executor') {
      return this.spec.exeuctor.handler
    }

    const target = this.spec.functions.find(v => v.name === name)

    if (!target) {
      throw new Error(`no such workflow target, name = ${name}`)
    }

    return target.handler
  }
}
