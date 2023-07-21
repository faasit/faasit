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

	static async main(): Promise<$FC_Open20210406.DeleteServiceResponse | undefined> {
		const accessID = aliyunConfig.accessID;
		const accessKey = aliyunConfig.accessKey;
		let client = Client.createClient(accessID, accessKey);
		let deleteServiceHeaders = new $FC_Open20210406.DeleteServiceHeaders({});
		let runtime = new $Util.RuntimeOptions({});
		try {
			let resp = await client.deleteServiceWithOptions("testService", deleteServiceHeaders, runtime);
			return resp;
		} catch (error) {
			console.log(error);
		}
	}

}

Client.main().then(value => {
	if (value) {
		console.log(value?.statusCode);
		console.log(value?.headers);
		console.log(value?.body);
	}
});