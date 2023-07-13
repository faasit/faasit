import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import aliyunConfig from "../config.json"


class Client {

    /**
     * 使用AK&SK初始化账号Client
     * @param accessKeyId
     * @param accessKeySecret
     * @return Client
     * @throws Exception
     */
    static createClient(accessKeyId: string, accessKeySecret: string): FC_Open20210406 {
        let config = new $OpenApi.Config({
            accessKeyId: accessKeyId,
            accessKeySecret: accessKeySecret,
        });
        config.endpoint = `${aliyunConfig.accountID}.${aliyunConfig.region}.fc.aliyuncs.com`;
        return new FC_Open20210406(config);
    }
    /**
     * API 相关
     * @param path params
     * @return OpenApi.Params
     */
    static createApiInfo(serviceName: string, functionName: string): $OpenApi.Params {
        let params = new $OpenApi.Params({
            // 接口名称
            action: "InvokeFunction",
            // 接口版本
            version: "2021-04-06",
            // 接口协议
            protocol: "HTTPS",
            // 接口 HTTP 方法
            method: "POST",
            authType: "AK",
            style: "FC",
            // 接口 PATH
            pathname: `/2021-04-06/services/${serviceName}/functions/${functionName}/invocations`,
            // 接口请求体内容格式
            reqBodyType: "json",
            // 接口响应体内容格式
            bodyType: "string"
        });
        return params;
    }

    static async main(): Promise<void> {
        const accessID = aliyunConfig.accessID;
        const accessKey = aliyunConfig.accessKey;
        let client = Client.createClient(accessID, accessKey);
        let runtime = new $Util.RuntimeOptions({});
        let params = Client.createApiInfo("testService","testFunc");
        let request = new $OpenApi.OpenApiRequest({});
        const resp = await client.callApi(params,request,runtime);
        console.log(resp);
    }

}

Client.main();