import { randomUUID } from "crypto";
import { LowLevelDurableClient } from "../durable";

export type InvocationMetadata = {
    id: string
    // useful for callback
    caller?: {
        funcName: string
        invocationId: string
    }
} & ({
    kind: 'call'
} | {
    kind: 'tell'
    callback?: {
        // context need to passed back to callback
        ctx: unknown
    }
    responseCtx?: unknown
})

export type DurableMetadata = {
    // consistent with one orchestrator
    orchestrator?: OrchestratorMetadata
}

export type OrchestratorMetadata = {
    id: string
    initialData: {
        input: object
        metadata: FaasitRuntimeMetadata
    }
}

// Metadata for faasit runtime, like invocation info
export interface FaasitRuntimeMetadata {
    funcName: string
    invocation: InvocationMetadata
    durable?: DurableMetadata
}

export function createFaasitRuntimeMetadata(opt: {
    funcName: string
}): FaasitRuntimeMetadata {
    return {
        funcName: opt.funcName,
        invocation: {
            id: randomUUID(),
            kind: 'call'
        }
    }
}

export type InputType = Record<string, unknown>
export type MetadataInput = Record<string, unknown>
export type CallbackParams = { input: InputType; ctx?: unknown; }
export type CallParams = { sequence?: number; input: InputType; }
export type CallResult = { output: any }

export type TellParams = {
    input: InputType

    // whether needs callback from remote function
    callback?: {
        // context need to passed back to callback
        ctx: unknown
    }

    // callback context (when response)
    responseCtx?: unknown
}

export type TellResult = {}

export interface FaasitRuntime {
    name: string

    metadata(): FaasitRuntimeMetadata;

    input(): InputType;

    output(returnObject: any): object;

    // sync call
    call(fnName: string, fnParams: CallParams): Promise<CallResult>;

    // async call
    tell(fnName: string, fnParams: TellParams): Promise<TellResult>;

    // extended features
    extendedFeatures?: {
        durable?: () => LowLevelDurableClient
        transaction?: () => void
    }
}

export abstract class BaseFaasitRuntime implements FaasitRuntime {
    name: string;
    metadata(): FaasitRuntimeMetadata {
        throw new Error(`Method not implemented.`)
    }

    input(): InputType {
        throw new Error("Method not implemented.");
    }

    output(returnObject: any): object {
        throw new Error("Method not implemented.");
    }

    call(fnName: string, fnParams: CallParams): Promise<CallResult> {
        throw new Error("Method not implemented.");
    }

    tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
        throw new Error("Method not implemented.");
    }

    // helpers function
    protected helperCollectMetadata(kind: 'call' | 'tell', fnName: string, params: CallParams | TellParams): FaasitRuntimeMetadata {
        const metadata = this.metadata()

        const baseInvocation: Pick<InvocationMetadata, 'id' | 'caller'> = {
            id: randomUUID(),
            caller: {
                funcName: metadata.funcName,
                invocationId: metadata.invocation.id
            }
        }

        const getInvocation = (): InvocationMetadata => {
            if (kind === 'tell') {
                const p = params as TellParams
                return {
                    ...baseInvocation,
                    kind: 'tell',
                    callback: p.callback,
                    responseCtx: p.responseCtx
                }
            }
            return {
                ...baseInvocation,
                kind: 'call',
            }
        }

        return {
            funcName: fnName,
            invocation: getInvocation()
        }
    }
}
