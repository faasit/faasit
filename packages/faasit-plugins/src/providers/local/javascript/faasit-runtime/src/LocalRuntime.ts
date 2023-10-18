import { FaasitRuntime } from "./FaasitRuntime";
// TODO: LocalRuntime
export class LocalRuntime implements FaasitRuntime {
    private event: any;
    constructor(event: any) {
        this.event = event;
    }
    call(fnName: string, fnParams: {
        sequence?: number;
        input: object;
    }): Promise<object> {
    }

    input() {
        return this.event;
    }

    output(returnObject: any) {
        return returnObject
    }
}