import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import aliyunConfig from "../config.json";
import Admzip from 'adm-zip';
import * as path from 'path';

function zipFolderAndEncode(folderPath: string): string {
	const zip = new Admzip();
	zip.addLocalFolder(folderPath);
	const zipBuffer = zip.toBuffer();
	const base64 = zipBuffer.toString("base64");
	return base64;
}

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

	static async main(): Promise<$FC_Open20210406.CreateFunctionResponse | undefined> {
		const accessID = aliyunConfig.accessID;
		const accessKey = aliyunConfig.accessKey;
		let client = Client.createClient(accessID, accessKey);

		let code = new $FC_Open20210406.Code({
			zipFile: zipFolderAndEncode(path.resolve(`${__dirname}`, "./code")),
		})
		let createFunctionHeaders = new $FC_Open20210406.CreateFunctionHeaders({});
		let createFunctionRequests = new $FC_Open20210406.CreateFunctionRequest({
			functionName: "testFunc",
			handler: "index.handler",
			runtime: "nodejs14",
			code: code
		});
		let runtime = new $Util.RuntimeOptions({});
		try {
			const resp = await client.createFunctionWithOptions("testService", createFunctionRequests, createFunctionHeaders, runtime);
			return resp;
		} catch (error) {
			console.log(error);
		}
	}

}

Client.main().then(value => {
	if (value) {
		console.log(value.statusCode);
		console.log(value.headers);
		console.log(value.body);
	}
});