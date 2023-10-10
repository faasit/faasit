import { FaasitRuntime } from "./FaasitRuntime";

// TODO: KnativeRuntime
export class KnativeRuntime implements FaasitRuntime {
    private context: any
    private event: any

    constructor(context: any, event: any) {
        this.context = context
        this.event = event
    }
    call() {
        return new Promise<object>((resolve, reject) => {
            resolve({});
        });
    }

    input() {
        return {}
    }

    output(obj: any) {
        return obj
    }
}