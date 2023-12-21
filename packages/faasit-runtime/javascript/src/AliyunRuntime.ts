import { BaseFaasitRuntime, CallResult, FaasitRuntime, FaasitRuntimeMetadata } from "./FaasitRuntime";
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';

// TODO: AliyunRuntime
export class AliyunRuntime extends BaseFaasitRuntime {

    name: string = "aliyun";

    constructor(private opt: { event: Buffer, context: any, callback: (error: any, data: object) => void, metadata: FaasitRuntimeMetadata }) {
        super()
    }

    metadata(): FaasitRuntimeMetadata {
        return this.opt.metadata
    }

    async call(fnName: string, fnParams?: {
        sequence?: number;
        input: object;
    }): Promise<CallResult> {
        const res = await this.invokeAliyunFunction(fnName, fnParams?.input);
        const result = res.body.toString();
        return { output: JSON.parse(result) };
    }

    input() {
        return JSON.parse(this.opt.event.toString())
    }

    output(returnObject: any) {
        this.opt.callback(null, returnObject)
        return returnObject
    }

    private invokeAliyunFunction(fnName: string, event: any) {
        const config = new $OpenApi.Config({
            accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
            accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
            endpoint: `${process.env.ALIBABA_CLOUD_PRODUCT_CODE}.${process.env.ALIBABA_CLOUD_REGION}.fc.aliyuncs.com`
        });
        const client = new FC_Open20210406(config)
        const invokeFunctionRequests = new $FC_Open20210406.InvokeFunctionRequest({
            body: event ? Util.toBytes(JSON.stringify(event)) : ''
        })

        return client.invokeFunction(`${process.env.ALIBABA_CLOUD_SERVICE}`, fnName, invokeFunctionRequests)
    }
}