import { BaseFaasitRuntime, CallResult, FaasitRuntime, FaasitRuntimeMetadata, InputType, StorageMethods } from "./FaasitRuntime";
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import OSS from 'ali-oss';

function newOSSBucketClient() {
    return new OSS({
        region: process.env.ALIBABA_CLOUD_OSS_REGION, // oss-cn-hangzhou
        accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
        bucket: process.env.ALIBABA_CLOUD_OSS_BUCKET_NAME // faasit
    })
}

function helperInvokeAliyunFunction(fnName: string, event: any) {
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

// @see https://help.aliyun.com/zh/fc/http-handler
export interface AliyunHttpRuntimeOptions {
    req: { body: Buffer }
    resp: {
        setHeader: (key: string, value: string) => void
        send: (body: string) => void
    }
    context: any,
    metadata: FaasitRuntimeMetadata
}

export class AliyunHttpRuntime extends BaseFaasitRuntime {
    name: string = "aliyun";
    bucket: OSS;

    constructor(private opt: AliyunHttpRuntimeOptions) {
        super()
        this.bucket = newOSSBucketClient();
    }

    metadata(): FaasitRuntimeMetadata {
        return this.opt.metadata
    }

    input(): InputType {
        return JSON.parse(this.opt.req.body.toString())
    }

    output(returnObject: any) {
        this.opt.resp.setHeader('content-type', 'application/json')
        this.opt.resp.send(JSON.stringify(returnObject))
        return returnObject
    }

    async call(fnName: string, fnParams?: {
        sequence?: number;
        input: object;
    }): Promise<CallResult> {
        const res = await helperInvokeAliyunFunction(fnName, fnParams?.input);
        const result = res.body.toString();
        return { output: JSON.parse(result) };
    }

    storage: StorageMethods = {
        put: async (filename: string, data: Buffer): Promise<void> => {
            try {
                const result = await this.bucket.put(filename, data)
                if (result.res.status >= 200 && result.res.status < 300) {
                    console.log(`[Info] Put data into ${filename} successfully.`);
                } else {
                    console.log(result);
                }
            } catch (error) {
                console.log(error);
            }
        },

        get: async (filename: string, timeout = -1): Promise<Buffer | null> => {
            const start_t = Date.now();
            const tryGetObject = async (): Promise<Buffer | null> => {
                if (await this.storage.exists(filename)) {
                    const result = await this.bucket.get(filename);
                    return result.content as Buffer;
                } else if (timeout > 0 && Date.now() - start_t > timeout) {
                    return null;
                } else {
                    return tryGetObject();
                }
            };

            return tryGetObject();
        },

        list: async (): Promise<string[]> => {
            const result = await this.bucket.list({
                'max-keys': 1000
            }, {
                timeout: 3000
            });
            return result.objects.map(object => object.name);
        },

        exists: async (filename: string): Promise<boolean> => {
            try {
                await this.bucket.head(filename);
                return true;
            } catch (error) {
                if (error.code === 'NoSuchKey') {
                    return false;
                }
            }
            return false;
        },

        del: async (filename: string): Promise<void> => {
            try {
                const result = await this.bucket.delete(filename);
                if (result.res.status >= 200 && result.res.status < 300) {
                    console.log(`[Info] Delete ${filename} successfully.`);
                } else {
                    console.log(result);
                }
            } catch (error) {
                console.log(error);
            }
        }
    };
}

export class AliyunEventRuntime extends BaseFaasitRuntime {
    name: string = "aliyun";
    bucket: OSS;

    constructor(private opt: { event: Buffer, context: any, callback: (error: any, data: object) => void, metadata: FaasitRuntimeMetadata }) {
        super()
        this.bucket = newOSSBucketClient();
    }

    metadata(): FaasitRuntimeMetadata {
        return this.opt.metadata
    }

    async call(fnName: string, fnParams?: {
        sequence?: number;
        input: object;
    }): Promise<CallResult> {
        const res = await helperInvokeAliyunFunction(fnName, fnParams?.input);
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

    storage: StorageMethods = {
        put: async (filename: string, data: Buffer): Promise<void> => {
            try {
                const result = await this.bucket.put(filename, data)
                if (result.res.status >= 200 && result.res.status < 300) {
                    console.log(`[Info] Put data into ${filename} successfully.`);
                } else {
                    console.log(result);
                }
            } catch (error) {
                console.log(error);
            }
        },

        get: async (filename: string, timeout = -1): Promise<Buffer | null> => {
            const start_t = Date.now();
            const tryGetObject = async (): Promise<Buffer | null> => {
                if (await this.storage.exists(filename)) {
                    const result = await this.bucket.get(filename);
                    return result.content as Buffer;
                } else if (timeout > 0 && Date.now() - start_t > timeout) {
                    return null;
                } else {
                    return tryGetObject();
                }
            };

            return tryGetObject();
        },

        list: async (): Promise<string[]> => {
            const result = await this.bucket.list({
                'max-keys': 1000
            }, {
                timeout: 3000
            });
            return result.objects.map(object => object.name);
        },

        exists: async (filename: string): Promise<boolean> => {
            try {
                await this.bucket.head(filename);
                return true;
            } catch (error) {
                if (error.code === 'NoSuchKey') {
                    return false;
                }
            }
            return false;
        },

        del: async (filename: string): Promise<void> => {
            try {
                const result = await this.bucket.delete(filename);
                if (result.res.status >= 200 && result.res.status < 300) {
                    console.log(`[Info] Delete ${filename} successfully.`);
                } else {
                    console.log(result);
                }
            } catch (error) {
                console.log(error);
            }
        }
    };
}
