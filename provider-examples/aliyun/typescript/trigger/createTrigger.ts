import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import OpenApiUtil from '@alicloud/openapi-util'
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
			action: "CreateTrigger",
			// 接口版本
			version: "2021-04-06",
			// 接口协议
			protocol: "HTTPS",
			// 接口 HTTP 方法
			method: "POST",
			authType: "AK",
			style: "FC",
			// 接口 PATH
			pathname: `/2021-04-06/services/${serviceName}/functions/${functionName}/triggers`,
			// 接口请求体内容格式
			reqBodyType: "json",
			// 接口响应体内容格式
			bodyType: "json",
		});
		return params;
	}

	static async main(): Promise<void> {
		const accessID = aliyunConfig.accessID;
		const accessKey = aliyunConfig.accessKey;
		let client = Client.createClient(accessID, accessKey);
		let params = Client.createApiInfo("testService", "testFunc")
		let body: string = OpenApiUtil.arrayToStringWithSpecifiedStyle({
			triggerConfig: JSON.stringify({
				"cronExpression": "@every 1h",
				"enable": true
			}),
			triggerName: "testTrigger",
			triggerType: "timer",
		}, 'body', 'json')
		let runtime = new $Util.RuntimeOptions({});
		let request = new $OpenApi.OpenApiRequest({
			body: body
		});
		try {
			const resp = await client.callApi(params, request, runtime);
			console.log(resp);
		} catch (error) {
			console.log(error);
		}
	}
	static async main2(): Promise<$FC_Open20210406.CreateTriggerResponse | undefined> {
		const accessID = aliyunConfig.accessID;
		const accessKey = aliyunConfig.accessKey;
		let client = Client.createClient(accessID, accessKey);
		let createTriggerHeaders = new $FC_Open20210406.CreateTriggerHeaders({});
		let createTriggerRequests = new $FC_Open20210406.CreateTriggerRequest({
			triggerName: "testTrigger",
			triggerType: "timer",
			triggerConfig: JSON.stringify({
				"cronExpression": "@every 1h",
				"enable": true,
				"payload": JSON.stringify({
					"hello": "world"
				})
			}),
		});
		let runtime = new $Util.RuntimeOptions({});
		try {
			const resp = client.createTriggerWithOptions("testService", "testFunc", createTriggerRequests, createTriggerHeaders, runtime);
			return resp;
		} catch (error) {
			console.log(error);
		}
	}

	static async mainHttp(): Promise<$FC_Open20210406.CreateTriggerResponse|undefined> {
		const accessID = aliyunConfig.accessID;
		const accessKey = aliyunConfig.accessKey;
		let client = Client.createClient(accessID, accessKey);
		let createTriggerHeaders = new $FC_Open20210406.CreateTriggerHeaders({});
		let createTriggerRequests = new $FC_Open20210406.CreateTriggerRequest({
			triggerName: "testTrigger",
			triggerType: "http",
			triggerConfig: JSON.stringify({
				'methods' :["POST","GET","PUT","DELETE"],
				'disableURLInternet' : false
			}),
		});
		let runtime = new $Util.RuntimeOptions({});
		try {
			const resp = client.createTriggerWithOptions("testService", "testFunc", createTriggerRequests, createTriggerHeaders, runtime);
			return resp;
		} catch (error) {
			console.log(error);
		}
	}
}

// Client.main();
Client.mainHttp().then(value => {
	if (value) {
		console.log(value.statusCode);
		console.log(value.headers);
		console.log(value.body);
	}
})