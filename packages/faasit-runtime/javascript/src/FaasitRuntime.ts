import { DurableClient } from "./durable";

export type CallResult = { output: any }

export interface FaasitRuntime {
    name: string

    input(): object;

    output(returnObject: any): object;

    call(fnName: string, fnParams: {
        sequence?: number;
        input: object;
    }): Promise<CallResult>;

    // extended features
    extendedFeatures?: {
        durable?: () => DurableClient
        transaction?: () => void
    }
}
