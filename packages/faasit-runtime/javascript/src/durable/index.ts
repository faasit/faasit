import { randomUUID } from "crypto";
import { HandlerType } from "..";
import { CallParams, CallResult, DurableMetadata, FaasitRuntime, FaasitRuntimeMetadata, InputType, OrchestratorMetadata, TellParams, TellResult } from "../runtime/FaasitRuntime";
import assert from "assert";

import * as utils from '../utils'
import { DurableClient } from "./client/DurableClient";
import { ScopeId } from "./scope/ScopeId";
import { ScopedDurableClient } from "./client/ScopedDurableClient";
import { DurableFunctionState } from "./state/DurableFunctionState";
import { getClient } from "./client";
import { DurableCallbackContext } from "./context/DurableCallbackContext";
import { parseDurableCallbackContext } from "./context";
import { DurableFaasitRuntime, DurableYieldIRQ } from "./DurableFaasitRuntime";

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

export * from "./client"
export * from "./client/LowLevelDurableClient"
export * from "./context"
export * from "./scope/ScopeId"
export * from "./state/DurableFunctionState"
