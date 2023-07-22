import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import Admzip from 'adm-zip';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({path:path.resolve(__dirname,"../.env")})

function zipFolderAndEncode(folderPath: string): string {
	const zip = new Admzip();
	zip.addLocalFolder(folderPath);
	const zipBuffer = zip.toBuffer();
	const base64 = zipBuffer.toString("base64");
	return base64;
}

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

	static async main(): Promise<$FC_Open20210406.UpdateFunctionResponse | undefined> {
		let client = Client.createClient();

		let code = new $FC_Open20210406.Code({
			zipFile: zipFolderAndEncode(path.resolve(`${__dirname}`, "./code")),
		})
		let headers = new $FC_Open20210406.UpdateFunctionHeaders({});
		let requests = new $FC_Open20210406.UpdateFunctionRequest({
			functionName: "testFunc",
			handler: "index.handler",
			runtime: "nodejs14",
			code: code
		});
		let runtime = new $Util.RuntimeOptions({});
		try {
			const resp = await client.updateFunctionWithOptions("testService", "testFunc",requests, headers, runtime);
			return resp;
		} catch (error) {
			console.log(error);
		}
	}

	static async mainCustom(): Promise<$FC_Open20210406.CreateFunctionResponse | undefined > {
		let client = Client.createClient();

		let code = new $FC_Open20210406.Code({
			zipFile: zipFolderAndEncode(path.resolve(`${__dirname}`, "./customCode")),
		})

		let createFunctionHeaders = new $FC_Open20210406.CreateFunctionHeaders({});
		let customRuntimeConfig = new $FC_Open20210406.CustomRuntimeConfig({
			command: [
				'node',
				'index.js'
			],
		})
		let createFunctionRequests = new $FC_Open20210406.CreateFunctionRequest({
			functionName       : "testFunc",
			handler            : "index.handler",
			runtime            : "custom",
			code               : code,
			customRuntimeConfig: customRuntimeConfig
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