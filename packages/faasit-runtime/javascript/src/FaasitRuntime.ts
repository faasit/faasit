import { LowLevelDurableClient } from "./durable";

export type InvocationMetadata = {
    funcName: string
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
})

// Metadata for faasit runtime, like invocation info
export interface FaasitRuntimeMetadata {
    invocation: InvocationMetadata
}

export type CallbackParams = { input: object; ctx?: unknown }
export type CallParams = { sequence?: number; input: object }
export type CallResult = { output: any }

export type TellParams = {
    input: object
    // context need to passed to callback
    callbackCtx?: unknown
}

export type TellResult = {}

export interface FaasitRuntime {
    name: string

    metadata(): FaasitRuntimeMetadata;

    input(): object;

    output(returnObject: any): object;

    // send back to caller
    callback(fnParams: CallbackParams): Promise<void>;

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

    input(): object {
        throw new Error("Method not implemented.");
    }

    output(returnObject: any): object {
        throw new Error("Method not implemented.");
    }

    async callback(fnParams: CallParams): Promise<void> {
        const metadata = this.metadata()
        const caller = metadata.invocation.caller
        if (!caller) {
            throw new Error(`no caller info in metadata`)
        }

        await this.tell(caller.funcName, fnParams)
    }

    call(fnName: string, fnParams: CallParams): Promise<CallResult> {
        throw new Error("Method not implemented.");
    }
    tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
        throw new Error("Method not implemented.");
    }
}
