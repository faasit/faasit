import { FaasitRuntime } from "./FaasitRuntime";

// TODO: LocalRuntime
export class LocalRuntime implements FaasitRuntime {
    private event: any;
    constructor(event: any) {
        this.event = event;
    }
    call() {
        return new Promise<object>((resolve, reject) => {
            resolve({});
        });
    }

    input() {
        return this.event;
    }

    output(returnObject: any) {
        return returnObject
    }
}