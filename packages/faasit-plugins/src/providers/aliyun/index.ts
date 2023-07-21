import { faas } from '@faasit/std'
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import * as aliyunConfig from './config.json'
import Admzip from 'adm-zip';

function createClient(
	accessKeyId: string,
	accessKeySecret: string,
	accountID: string,
	region: string,
): FC_Open20210406 {
	let config = new $OpenApi.Config({
		accessKeyId: accessKeyId,
		accessKeySecret: accessKeySecret
	});
	config.endpoint = `${accountID}.${region}.fc.aliyuncs.com`;
	return new FC_Open20210406(config);
}

function createApiInfo(opts: {
	method: string,
	pathName: string,
	action: string,
}): $OpenApi.Params {
	return new $OpenApi.Params({
		action: opts.action,
		version: "2021-04-06",
		protocol: "HTTPS",
		method: opts.method,
		authType: "AK",
		style: "FC",
		pathname: opts.pathName,
		reqBodyType: "json",
		bodyType: "json"
	})
}

async function createService():
	Promise<$FC_Open20210406.CreateServiceResponse | undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let createServiceHeaders = new $FC_Open20210406.CreateServiceHeaders({});
	let createServiceRequest = new $FC_Open20210406.CreateServiceRequest({
		serviceName: "faasit",
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		let resp = await client.createServiceWithOptions(createServiceRequest, createServiceHeaders, runtime);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function getService():
	Promise<$FC_Open20210406.GetServiceResponse | undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let getServiceHeaders = new $FC_Open20210406.GetServiceHeaders({});
	let getServiceRequest = new $FC_Open20210406.GetServiceRequest({});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.getServiceWithOptions("faasit", getServiceRequest, getServiceHeaders, runtime);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function createFunction(fn: {
	functionName: string,
	codeDir: string,
	runtime: string,
	handler: string,
}): Promise<$FC_Open20210406.CreateFunctionResponse | undefined> {

	let zipFolderAndEncode = (folderPath: string) => {
		const zip = new Admzip();
		zip.addLocalFolder(folderPath);
		const zipBuffer = zip.toBuffer();
		const base64 = zipBuffer.toString('base64');
		return base64;
	};

	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let code = new $FC_Open20210406.Code({
		zipFile: zipFolderAndEncode(fn.codeDir),
	})
	let createFunctionHeaders = new $FC_Open20210406.CreateFunctionHeaders({});
	let createFunctionRequests = new $FC_Open20210406.CreateFunctionRequest({
		functionName: fn.functionName,
		handler: fn.handler,
		runtime: fn.runtime,
		code: code
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.createFunctionWithOptions("faasit", createFunctionRequests, createFunctionHeaders, runtime);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function getFunction(functionName: string): Promise<{ [key: string]: any } | undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let getFunctionRequests = new $FC_Open20210406.GetFunctionRequest({});
	try {
		const resp = await client.getFunction("faasit", functionName, getFunctionRequests);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function invokeFunction(functionName: string)
	: Promise<$FC_Open20210406.InvokeFunctionResponse | undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let invokeFunctionRequests = new $FC_Open20210406.InvokeFunctionRequest({});
	try {
		const resp = await client.invokeFunction("faasit", functionName, invokeFunctionRequests);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function createTrigger(
	functionName: string,
	triggerOpts: {
		triggerName: string,
		triggerType: string,
		triggerConfig: {[key:string]:any},
	}
):Promise<$FC_Open20210406.CreateTriggerResponse|undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let headers = new $FC_Open20210406.CreateTriggerHeaders({});
	let requests = new $FC_Open20210406.CreateTriggerRequest({
		triggerName: triggerOpts.triggerName,
		triggerType: triggerOpts.triggerType,
		triggerConfig: JSON.stringify(triggerOpts.triggerConfig)
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.createTriggerWithOptions(
			'faasit',
			functionName,
			requests,
			headers,
			runtime
		);
		return resp;
	} catch (error) {
		console.log(error);
	}
}

async function getTrigger(functionName:string,triggerName:string)
: Promise<$FC_Open20210406.GetTriggerResponse|undefined> {
	const accessID = aliyunConfig.accessID;
	const accessKey = aliyunConfig.accessKey;
	const accountID = aliyunConfig.accountID;
	const region = aliyunConfig.region;
	let client = createClient(accessID, accessKey, accountID, region);
	let headers = new $FC_Open20210406.GetTriggerHeaders({});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.getTriggerWithOptions(
			'faasit',
			functionName,
			triggerName,
			headers,
			runtime
		);
		return resp;
	} catch (error) {
		console.log(error)
	}
}

export default function AliyunPlugin(): faas.ProviderPlugin {

	return {
		name: "aliyun",
		async deploy(input, ctx) {
			const { rt, logger } = ctx
			const { app } = input

			logger.info('aliyun deploy')

			for (const fn of app.functions) {
				logger.info(`deploy function ${fn.name}`)

				await getService().then(getServiceResp => {
					if (getServiceResp) {
						logger.info("aliyun service faasit exists")
						return;
					} else {
						logger.info("aliyun service faasits doesn't exist, it will be created...")
						createService();
					}
				})


				await getFunction(fn.name).then(getFunctionResp => {
					if (getFunctionResp) {
						logger.info(`aliyun function ${fn.name} exists`);
						return;
					} else {
						logger.info(`create aliyun function ${fn.name}`);
						createFunction({
							functionName: fn.name,
							codeDir: fn.codeDir,
							runtime: fn.runtime,
							handler: fn.handler ? fn.handler : "index.handler"
						})
					}
				})
				
				// for(let trigger in fn.triggers) {

				// }
			}
		},

		async invoke(input,ctx) {
			const {rt,logger} = ctx;
			logger.info(`invoke function ${input.funcName}`);

			await invokeFunction(input.funcName).then(resp=>{
				if (resp) {
					logger.info(resp.body.toString());
				}
			})
		}
	}
}