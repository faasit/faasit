import { randomUUID } from "crypto";
import { HandlerType } from "..";
import { CallParams, CallResult, FaasitRuntime, TellParams, TellResult } from "../FaasitRuntime";

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

// High-Level API

export function createDurable(fn: (frt: DurableFaasitRuntime) => Promise<void>): HandlerType {

  return async (frt) => {
    const metadata = frt.metadata()

    const getState = async () => {
      const invocationId = metadata.invocation.id || randomUUID()
      const scopeId = ScopeId.create({
        ns: '__state__', name: invocationId, type: 'orchestration'
      })
      const client = getClient(frt).getScoped(scopeId)

      // first called, init state
      if (!metadata.invocation.caller) {

        const state = new DurableFunctionState()
        await state.store(client)

        return state
      } else {
        // recover state
        return await DurableFunctionState.load(client)
      }
    }

    const state = await getState()

    const durableRt = new DurableFaasitRuntime(frt, state)

    // catch and schedule
    try {
      return await fn(durableRt)
    } catch (e) {
      if (e instanceof DurableYieldIRQ) {
        // TODO: handle scheduling
      }
    }
  }
}

// Serializable state
export class DurableFunctionState {

  static async load(client: ScopedDurableClient): Promise<DurableFunctionState> {
    const state = new DurableFunctionState()
    return state
  }

  async store(client: ScopedDurableClient): Promise<void> {
    console.log(`store function state`)
  }

}

// IRQ = Interrupt ReQuest, like softirq in Linux
export class DurableYieldIRQ extends Error {
  constructor(private state: DurableFunctionState) {
    super(`DurableYieldIRQ`)
  }
}

// Special faasit runtime with durable feature
export class DurableFaasitRuntime {
  constructor(private rt: FaasitRuntime, private _state: DurableFunctionState) { }

  get state(): DurableFunctionState {
    return this._state
  }

  input(): object {
    return this.rt.input()
  }

  output(returnObject: any): object {
    return this.rt.output(returnObject)
  }

  async call(fnName: string, fnParams: CallParams): Promise<CallResult> {
    const invocationId = this.rt.metadata().invocation.id
    // tell function
    await this.rt.tell(fnName, {
      ...fnParams,
      state: undefined,
      ctx: {
        kind: 'state-call-callback',
        invocationId
      }
    } as TellParams)

    // yield and schedule next
    throw new DurableYieldIRQ(this._state)
  }

  async tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
    return await this.rt.tell(fnName, fnParams)
  }
}
