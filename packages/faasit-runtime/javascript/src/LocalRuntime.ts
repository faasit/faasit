import { FaasitRuntime } from "./FaasitRuntime";

// TODO: LocalRuntime
export class LocalRuntime implements FaasitRuntime {
    private event: any;
    constructor(event: any) {
        this.event = event;
    }
    call() {
        return {};
    }

    input() {
        return this.event;
    }

    output(obj: any) {
        return obj
    }
}