import { FaasitRuntime } from "./FaasitRuntime";

// TODO: AliyunRuntime
export class AliyunRuntime implements FaasitRuntime {
    private event: Buffer;
    private context: any;
    private callback: (error: any, data: any) => void;
    constructor(event: Buffer, context: any, callback: any) {
        this.event = event;
        this.context = context;
        this.callback = callback;
    }
    call() {
        return {};
    }

    input() {
        return this.event;
    }

    output(obj: any) {
        this.callback(null, obj);
        return obj
    }
}