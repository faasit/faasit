import { randomUUID } from "crypto";
import { HandlerType } from "..";
import { CallParams, CallResult, DurableMetadata, FaasitRuntime, FaasitRuntimeMetadata, InputType, OrchestratorMetadata, TellParams, TellResult } from "../FaasitRuntime";
import assert from "assert";

import * as utils from '../utils'

export interface LowLevelDurableClient {
  set(key: string, value: unknown): Promise<void>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultFn: (() => T)): Promise<T>;
}

export class ScopeId {
  constructor(readonly ns: string, readonly name: string, readonly type: string = 'scoped') { }

  static create(opt: { ns: string, name: string, type?: string }): ScopeId {
    return new ScopeId(opt.ns, opt.name, opt.type)
  }

  toString(): string {
    return `${this.type}.${this.ns}.${this.name}`
  }
}

// High-level API
export class DurableClient {
  constructor(private dc: LowLevelDurableClient) { }

  // returns scoped client
  getScoped(scopeId: ScopeId): ScopedDurableClient {
    return new ScopedDurableClient(this.dc, scopeId)
  }

  getEntity(): never {
    throw new Error('not implemented');
  }
}

export interface ScopedDurableClient {
  set(key: string, value: unknown): Promise<void>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultFn: (() => T)): Promise<T>;
}
export class ScopedDurableClient {
  constructor(private dc: LowLevelDurableClient, private scopeId: ScopeId) { }

  async set(key: string, value: unknown): Promise<void> {
    return this.dc.set(this.buildKey(key), value)
  }
  async get<T = unknown>(key: string, defaultFn?: (() => T) | undefined): Promise<T | undefined> {
    const realKey = this.buildKey(key)
    if (defaultFn) {
      return this.dc.get(realKey, defaultFn)
    }
    return this.dc.get(realKey)
  }

  private buildKey(key: string) {
    return `${this.scopeId}::${key}`
  }
}

export function getClient(frt: FaasitRuntime): DurableClient {
  const durable = frt.extendedFeatures?.durable;
  if (!durable) {
    throw new Error(`durable feature is not available in this runtime=${frt.name}.`);
  }
  const dc = durable.bind(frt)()
  return new DurableClient(dc)
}

// Pass data by callback context
type DurableCallbackContext = {
  kind: 'durable-orchestrator-callback'
  orchestrator: OrchestratorMetadata
  taskPc: number
}

function parseDurableCallbackContext(ctx: unknown): DurableCallbackContext | undefined {
  if (typeof ctx !== 'object' || ctx == null) {
    return undefined
  }

  if ((ctx as DurableCallbackContext)['kind'] !== 'durable-orchestrator-callback') {
    return undefined
  }

  return ctx as DurableCallbackContext
}

// Tricky way to mark function as orchestrator, only useful in local-once runtime
// the local once runtime should polling and wait it until end
// TODO: Refactor it
export class IsDurableOrchestratorFlag {
  constructor(public orchestratorId: string) {
  }
}

function createOrchestatorScopeId(orcheId: string): ScopeId {
  const scopeId = ScopeId.create({
    ns: '__state__', name: orcheId, type: 'orchestration'
  })
  return scopeId
}

// High-Level API
export function createDurable(fn: (frt: DurableFaasitRuntime) => Promise<unknown>): HandlerType {

  return async (frt) => {
    const metadata = frt.metadata()

    let orchestratorMetadata: OrchestratorMetadata

    let callbackCtx: DurableCallbackContext | undefined

    // parse callback ctx
    if (metadata.invocation.kind === 'tell') {
      callbackCtx = parseDurableCallbackContext(metadata.invocation.responseCtx)
    }

    // initialized required metadata
    if (callbackCtx) {
      // non-first called
      orchestratorMetadata = callbackCtx.orchestrator
      metadata.durable = {
        orchestrator: orchestratorMetadata
      }
    } else {
      // first called, no orchestrator metadata definied, init orchestrator
      orchestratorMetadata = {
        id: randomUUID(),
        initialData: {
          input: frt.input(),
          metadata: frt.metadata()
        }
      }

      metadata.durable = {
        orchestrator: orchestratorMetadata
      }

      console.log(`first called durable function, name=${metadata.funcName}, orche=`, orchestratorMetadata)
    }

    const orchestratorId = orchestratorMetadata.id

    const scopeId = createOrchestatorScopeId(orchestratorId)
    const client = getClient(frt).getScoped(scopeId)

    const { state } = await DurableFunctionState.load(client)

    // update task if not first called
    if (callbackCtx) {
      const result = frt.input()
      const action = state.actions[callbackCtx.taskPc]
      if (!action) {
        throw new Error(`no such task in durable state, taskPc=${callbackCtx.taskPc}`)
      }
      action.status = 'done'
      action.result = { output: result }

      await state.store(client)
    }

    const durableRt = new DurableFaasitRuntime(frt, state)

    // catch and schedule
    try {
      const result = await fn(durableRt)

      // console.log(`running callback`, metadata.invocation)
      await utils.handlePostCallback(frt, {
        result: result as InputType,
        metadata: orchestratorMetadata.initialData.metadata
      })

      // save result
      await state.saveResult(client, result)

    } catch (e) {
      if (e instanceof DurableYieldIRQ) {
        console.log(`[Trace] ${metadata.funcName} id=${orchestratorId} yield, store the state`)

        // store state
        await state.store(client)

        return new IsDurableOrchestratorFlag(orchestratorId)
      }
    }
  }
}

export async function waitOrchestratorResult(frt: FaasitRuntime, orcheId: string, opt: {
  pollingMs?: number
  deadlineMs?: number
}) {
  const { pollingMs = 100, deadlineMs = 2000 } = opt

  const scopeId = createOrchestatorScopeId(orcheId)
  const client = getClient(frt).getScoped(scopeId)

  for (let i = 0; i < deadlineMs; i += pollingMs) {
    const finished = await client.get(`finished`, () => false)
    if (finished) {
      break
    }

    // wait
    await new Promise((resolve) => setTimeout(resolve, pollingMs))
  }

  return client.get(`result`)
}

// Serializable action
type Action = {
  kind: 'call',
  status: 'pending' | 'done'
  result: CallResult
}

// Serializable state
export class DurableFunctionState {

  private _actions: Action[] = []
  constructor() { }

  static async load(client: ScopedDurableClient): Promise<{
    init: boolean,
    state: DurableFunctionState
  }> {

    const initialized = client.get('initialized', () => false)

    // init state
    if (!initialized) {
      const state = new DurableFunctionState()
      await client.set(`initialized`, true)
      await client.set(`finished`, false)
      await state.store(client)
      return { state, init: true }
    }

    // load initialized state
    const state = new DurableFunctionState()
    state._actions = await client.get('actions', () => []) as Action[]
    return { state, init: false }
  }

  async store(client: ScopedDurableClient): Promise<void> {
    client.set('actions', this._actions)
  }

  async saveResult(client: ScopedDurableClient, result: unknown): Promise<void> {
    await client.set(`finished`, true)
    await client.set(`result`, result)
  }

  addAction(action: Action) {
    this._actions.push(action)
  }

  get actions() {
    return this._actions
  }

}

// IRQ = Interrupt ReQuest, like softirq in Linux
class DurableYieldIRQ extends Error {
  constructor() {
    super(`DurableYieldIRQ`)
  }
}

// Special faasit runtime with durable feature
export class DurableFaasitRuntime {
  // program counter
  private _pc: number = 0

  private orchestratorMetadata: NonNullable<DurableMetadata['orchestrator']>
  constructor(private rt: FaasitRuntime, private _state: DurableFunctionState) {
    const orcheMetadata = rt.metadata().durable?.orchestrator
    if (!orcheMetadata) {
      throw new Error(`no durable.orchestrator definied in metadata`)
    }
    this.orchestratorMetadata = orcheMetadata
  }

  get state(): DurableFunctionState {
    return this._state
  }

  metadata(): FaasitRuntimeMetadata {
    return this.orchestratorMetadata.initialData.metadata
  }

  input(): object {
    return this.orchestratorMetadata.initialData.input
  }

  output(returnObject: any): object {
    return this.rt.output(returnObject)
  }

  async call(fnName: string, fnParams: CallParams): Promise<CallResult> {
    const pc = this.incrPc()

    // already called
    if (pc < this._state.actions.length) {
      const task = this._state.actions[pc]
      assert(task.kind === 'call' && task.status === 'done')
      return task.result
    }

    // not called, create task

    // tell function and need callback
    await this.rt.tell(fnName, {
      ...fnParams,
      callback: {
        ctx: {
          kind: 'durable-orchestrator-callback',
          orchestrator: this.orchestratorMetadata,
          taskPc: pc
        } as DurableCallbackContext
      }
    })

    this._state.addAction({
      kind: 'call',
      status: 'pending',
      result: { output: {} }
    })

    // yield and suspend until callback
    throw new DurableYieldIRQ()
  }

  async tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
    return await this.rt.tell(fnName, fnParams)
  }

  private incrPc() {
    const pc = this._pc
    ++this._pc
    return pc
  }
}
