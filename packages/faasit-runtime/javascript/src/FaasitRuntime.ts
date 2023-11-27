export type CallResult = { output: any }

export interface FaasitRuntime {
    input(): object;

    output(returnObject: any): object;

    call(fnName: string, fnParams: {
        sequence?: number;
        input: object;
    }): Promise<CallResult>;
}