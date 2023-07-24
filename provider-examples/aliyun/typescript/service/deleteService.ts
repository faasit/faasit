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

	static async main(): Promise<$FC_Open20210406.DeleteServiceResponse | undefined> {
		let client = Client.createClient();
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