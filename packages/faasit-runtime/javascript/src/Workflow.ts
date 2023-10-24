import { FaasitRuntime } from "./FaasitRuntime"

type HandlerType = (frt: FaasitRuntime) => unknown

type DeclarativeWorkflowBuilder = () => unknown

export interface WorkflowBuilder {
  // configure function slot
  slot(name: string): WorkflowSlotBuilder

  // get all valid slot names
  get_slots(): string[]

  // configure executor
  executor(): WorkflowExecutorBuilder

  // finalize and output workflow spec (used by engine)
  build(): WorkflowSpec
}

export interface WorkflowSlotBuilder {
  // add handler
  set_handler(fn: HandlerType): WorkflowSlotBuilder
}

export interface WorkflowExecutorBuilder {
  // use custom executor to replace auto generated executor
  set_custom_handler(fn: HandlerType): WorkflowExecutorBuilder

  // use declarative workflow description language to describe a workflow
  // TODO: design declarative and higher level api to describe workflow
  set_declarative(): WorkflowExecutorBuilder
}

// TODO: design details for WorkflowSpec
export interface WorkflowSpec { }
