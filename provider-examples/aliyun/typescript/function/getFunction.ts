import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({path:path.resolve(__dirname,"../.env")})

class Client {

	static createClient(): FC_Open20210406 {
		const accessKeyId = process.env.accessID;
		const accessKeySecret = process.env.accessKey;
		const accountID = process.env.accountID;
		const region = process.env.region;
		let config = new $OpenApi.Config({
			accessKeyId: accessKeyId,
			accessKeySecret: accessKeySecret,
		});
		config.endpoint = `${accountID}.${region}.fc.aliyuncs.com`;
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
			action: "GetFunction",
			// 接口版本
			version: "2021-04-06",
			// 接口协议
			protocol: "HTTPS",
			// 接口 HTTP 方法
			method: "GET",
			authType: "AK",
			style: "FC",
			// 接口 PATH
			pathname: `/2021-04-06/services/${serviceName}/functions/${functionName}`,
			// 接口请求体内容格式
			reqBodyType: "json",
			// 接口响应体内容格式
			bodyType: "json",
		});
		return params;
	}

	static async main(): Promise<void> {
		let client = Client.createClient();
		let params = Client.createApiInfo("testService", "testFunc")
		let runtime = new $Util.RuntimeOptions({});
		let request = new $OpenApi.OpenApiRequest({});
		try {
			const resp = await client.callApi(params, request, runtime);
			console.log(resp);
		} catch (error) {
			console.log(error);
		}
	}

	static async main2(): Promise<$FC_Open20210406.GetFunctionResponse|undefined> {
		let client = Client.createClient();
		let getFunctionRequests = new $FC_Open20210406.GetFunctionRequest({});
		try {
			const resp = await client.getFunction("testService","testFunc",getFunctionRequests);
			return resp;
		} catch (error) {
			console.log(error);
		}
 	}

}

Client.main2().then(value=>{
	if(value) {
		console.log(value.statusCode);
		console.log(value.headers);
		console.log(value.body);
	}
});