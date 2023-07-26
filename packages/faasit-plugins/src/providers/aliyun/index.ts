import { faas } from '@faasit/std'
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import Admzip from 'adm-zip';
import path from 'path';
import dotenv from 'dotenv';
import * as Trigger from "./utils/trigger";
import axios, { Axios } from "axios";

dotenv.config({ path: path.resolve(__dirname, "./.env") });


function createClient(): FC_Open20210406 {
	const accessKeyId = process.env.accessID;
	const accessKeySecret = process.env.accessKey;
	const accountID = process.env.accountID;
	const region = process.env.region;
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
	let client = createClient();
	let createServiceHeaders = new $FC_Open20210406.CreateServiceHeaders({});
	let createServiceRequest = new $FC_Open20210406.CreateServiceRequest({
		serviceName: "faasit",
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		let resp = await client.createServiceWithOptions(
			createServiceRequest,
			createServiceHeaders,
			runtime);
		return resp;
	} catch (error) {
		throw error;
	}
}

async function getService():
	Promise<$FC_Open20210406.GetServiceResponse | undefined> {
	let client = createClient();
	let getServiceHeaders = new $FC_Open20210406.GetServiceHeaders({});
	let getServiceRequest = new $FC_Open20210406.GetServiceRequest({});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.getServiceWithOptions(
			"faasit",
			getServiceRequest,
			getServiceHeaders,
			runtime);
		return resp;
	} catch (error) {
		if (error.code != 'ServiceNotFound') {
			throw error;
		}
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

	let client = createClient();
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
		const resp = await client.createFunctionWithOptions(
			"faasit",
			createFunctionRequests,
			createFunctionHeaders,
			runtime);
		return resp;
	} catch (error) {
		throw error;
	}
}

async function getFunction(functionName: string): Promise<{ [key: string]: any } | undefined> {
	let client = createClient();
	let getFunctionRequests = new $FC_Open20210406.GetFunctionRequest({});
	try {
		const resp = await client.getFunction("faasit", functionName, getFunctionRequests);
		return resp;
	} catch (error) {
		if (error.code != 'FunctionNotFound') {
			throw error;
		}
	}
}

async function updateFunction(fn: {
	functionName: string,
	codeDir: string,
	runtime: string,
	handler: string,
}): Promise<$FC_Open20210406.UpdateFunctionResponse | undefined> {
	let zipFolderAndEncode = (folderPath: string) => {
		const zip = new Admzip();
		zip.addLocalFolder(folderPath);
		const zipBuffer = zip.toBuffer();
		const base64 = zipBuffer.toString('base64');
		return base64;
	};
	let client = createClient();
	let code = new $FC_Open20210406.Code({
		zipFile: zipFolderAndEncode(fn.codeDir),
	})
	let headers = new $FC_Open20210406.UpdateFunctionHeaders({});
	let requests = new $FC_Open20210406.UpdateFunctionRequest({
		functionName: fn.functionName,
		handler: fn.handler,
		runtime: fn.runtime,
		code: code
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.updateFunctionWithOptions(
			"faasit",
			fn.functionName,
			requests,
			headers,
			runtime);
		return resp;
	} catch (error) {
		throw error;
	}
}

async function invokeFunction(functionName: string)
	: Promise<$FC_Open20210406.InvokeFunctionResponse | undefined> {
	let client = createClient();
	let invokeFunctionRequests = new $FC_Open20210406.InvokeFunctionRequest({});
	try {
		const resp = await client.invokeFunction("faasit", functionName, invokeFunctionRequests);
		return resp;
	} catch (error) {
		throw error;
	}
}


async function createTrigger(
	functionName: string,
	triggerOpts: {
		triggerName: string,
		triggerType: string,
		triggerConfig: { [key: string]: any },
	}
): Promise<$FC_Open20210406.CreateTriggerResponse | undefined> {
	let client = createClient();
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
		throw error;
	}
}

async function updateTrigger(
	functionName: string,
	triggerOpts: {
		triggerName: string,
		triggerType: string,
		triggerConfig: { [key: string]: any },
	}
): Promise<$FC_Open20210406.UpdateTriggerResponse | undefined> {
	let client = createClient();
	let headers = new $FC_Open20210406.UpdateTriggerHeaders({});
	let requests = new $FC_Open20210406.UpdateTriggerRequest({
		triggerName: triggerOpts.triggerName,
		triggerType: triggerOpts.triggerType,
		triggerConfig: JSON.stringify(triggerOpts.triggerConfig)
	});
	let runtime = new $Util.RuntimeOptions({});
	try {
		const resp = await client.updateTriggerWithOptions(
			'faasit',
			functionName,
			triggerOpts.triggerName,
			requests,
			headers,
			runtime
		);
		return resp;
	} catch (err) {
		throw err;
	}
}

async function getTrigger(functionName: string, triggerName: string)
	: Promise<$FC_Open20210406.GetTriggerResponse | undefined> {
	let client = createClient();
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
		if (error.code != 'TriggerNotFound') {
			throw error;
		}
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
						logger.info("aliyun service faasit exists");
						return;
					} else {
						logger.info("aliyun service faasit doesn't exist, it will be created...")
						createService().catch(err => {
							logger.error(err);
							return;
						});
					}
				}).catch(err => {
					logger.error(err);
				});


				await getFunction(fn.name).then(async getFunctionResp => {
					if (getFunctionResp) {
						logger.info(`aliyun function ${fn.name} exists, it will be updated!`);
						logger.info('update function results: ');
						await updateFunction({
							functionName: fn.name,
							codeDir: fn.codeDir,
							runtime: fn.runtime,
							handler: fn.handler ? fn.handler : "index.handler"
						})
							.then(updateFunctionResp => {
								if (updateFunctionResp) {
									console.log(updateFunctionResp.body.toMap());
								}
							})
							.catch(err => {
								logger.error(err);
							})
					} else {
						logger.info(`create aliyun function ${fn.name}...`);
						logger.info('create function results: ');
						await createFunction({
							functionName: fn.name,
							codeDir: fn.codeDir,
							runtime: fn.runtime,
							handler: fn.handler ? fn.handler : "index.handler"
						})
							.then(createFunctionResp => {
								console.log(createFunctionResp?.body.toMap());
							})
							.catch(err => {
								logger.error(err);
							})
					}
				}).catch(err => {
					logger.error(err);
				})

				for (let trigger of fn.triggers) {
					const baseTrigger = await Trigger.getTrigger({
						kind: trigger.kind,
						name: trigger.name,
						opts: {/**TODO */ }
					})
					await getTrigger(fn.name, trigger.name).then(async getTriggerResp => {
						if (getTriggerResp) {
							logger.info(`aliyun trigger ${trigger.name} exists, it will be updated!`);
							await updateTrigger(fn.name, {
								triggerName: trigger.name,
								triggerType: trigger.kind,
								triggerConfig: baseTrigger.triggerConfig
							})
								.then(updateTriggerResp => {
									if (updateTriggerResp) {
										logger.info("update trigger results: ");
										console.log(updateTriggerResp.body.toMap());
									}
								})
						} else {
							logger.info(`create trigger ${trigger.name}...`);
							await createTrigger(fn.name, {
								triggerName: trigger.name,
								triggerType: trigger.kind,
								triggerConfig: baseTrigger.triggerConfig
							})
								.then(createTriggerResp => {
									if (createTriggerResp) {
										logger.info("create trigger results: ")
										console.log(createTriggerResp.body.toMap());
									}
								})
								.catch(err => {
									logger.error(err);
								});
						}
					}).catch(err => {
						logger.error(err);
					})
				}
			}
		},

		async invoke(input, ctx) {
			const { rt, logger } = ctx;
			const { app } = input;
			
			for (const fn of app.functions) {
				logger.info(`invoke function ${fn.name}`);
				if (fn.triggers.length > 0 && fn.triggers[0].kind == 'http') {
					await getTrigger(fn.name, fn.triggers[0].name)
						.then(async triggerResp => {
							const urlInternet = triggerResp?.body.urlInternet || "";
							const urlWithoutHttp = urlInternet.replace(/^(http|https):\/\//, "");

							await axios.get(urlInternet)
								.then(resp => {
									logger.info("function invoke results:");
									console.log(resp.data);
								})
						})
						.catch(err => {
							logger.error(err);
						})
				} else {
					await invokeFunction(fn.name).then(resp => {
						if (resp) {
							logger.info(resp.body.toString());
						}
					})
				}

			}

		}
	}
}