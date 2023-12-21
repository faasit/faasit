import { BaseFaasitRuntime, CallResult, FaasitRuntimeMetadata, InputType } from "./FaasitRuntime";
import axios from "axios";

// TODO: KnativeRuntime
export class KnativeRuntime extends BaseFaasitRuntime {
    name: string = "knative";

    constructor(private opt: {
        context: unknown
        event: unknown
        metadata: FaasitRuntimeMetadata
    }) {
        super()
    }

    metadata(): FaasitRuntimeMetadata {
        return this.opt.metadata
    }

    async call(fnName: string, fnParams?: {
        sequence?: number;
        input: object;
    }): Promise<CallResult> {
        const res = await this.invokeKnativeFunction(fnName, fnParams?.input);
        const result = res.data;
        return { output: result };
    }

    input() {
        return this.opt.event as InputType
    }

    output(returnObject: any) {
        return {
            headers: {
                "content-type": "application/json"
            },
            body: returnObject
        }
    }

    private async invokeKnativeFunction(fnName: string, event: any) {
        const svcName = `${process.env.FAASIT_APP_NAME}-${fnName}`
        const url = `http://${svcName}.faasit.192.168.1.240.sslip.io`
        return await axios.post(url, event)
    }
}