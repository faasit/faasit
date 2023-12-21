import assert from "assert"
import { CallParams, CallResult, DurableMetadata, FaasitRuntime, FaasitRuntimeMetadata, InputType, TellParams, TellResult } from "../runtime/FaasitRuntime"
import { DurableCallbackContext } from "./context/DurableCallbackContext"
import { DurableFunctionState } from "./state/DurableFunctionState"

// IRQ = Interrupt ReQuest, like softirq in Linux
export class DurableYieldIRQ extends Error {
    constructor() {
        super(`DurableYieldIRQ`)
    }
}

// Special faasit runtime with durable feature
export class DurableFaasitRuntime implements FaasitRuntime {
    // program counter
    private _pc: number = 0

    private orchestratorMetadata: NonNullable<DurableMetadata['orchestrator']>
    constructor(private rt: FaasitRuntime, private _state: DurableFunctionState) {
        if (rt instanceof DurableFaasitRuntime) {
            throw new Error(`DurableFaasitRuntime can not be nested`)
        }
        const orcheMetadata = rt.metadata().durable?.orchestrator
        if (!orcheMetadata) {
            throw new Error(`no durable.orchestrator definied in metadata`)
        }
        this.orchestratorMetadata = orcheMetadata
    }

    get name(): string {
        return `durable-${this.rt.name}`
    }

    get state(): DurableFunctionState {
        return this._state
    }

    metadata(): FaasitRuntimeMetadata {
        return this.orchestratorMetadata.initialData.metadata
    }

    input(): InputType {
        return this.orchestratorMetadata.initialData.input as InputType
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