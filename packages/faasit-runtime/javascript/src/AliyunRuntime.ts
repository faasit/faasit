import { CallResult, FaasitRuntime } from "./FaasitRuntime";
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';

// TODO: AliyunRuntime
export class AliyunRuntime implements FaasitRuntime {

    name: string = "aliyun";

    private event: Buffer;
    private context: any;
    private callback: (error: any, data: object) => void;
    constructor(event: Buffer, context: any, callback: any) {
        this.event = event;
        this.context = context;
        this.callback = callback;
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
        return JSON.parse(this.event.toString())
    }

    output(returnObject: any) {
        this.callback(null, returnObject)
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