import { faas } from '@faasit/std'
import * as Trigger from "./utils/trigger";
import axios, { Axios } from "axios";
import { AliyunFunction, AliyunService, AliyunTrigger } from './utils'
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, "./.env") });


interface DeployParams {
	ctx: faas.ProviderPluginContext
	input: faas.ProviderDeployInput
}

interface DeployFunctionParams {
	workflowFuncType: string,
	name: string,
	codeDir: string
}

async function deployFunctions(p: DeployParams) {
	const { app } = p.input
	const { logger } = p.ctx

	logger.info('aliyun deploy')

	for (const fnRef of app.output.functions) {
		const fn = fnRef.value
		logger.info(`deploy function ${fn.$ir.name}`)

		let service = new AliyunService();
		await service.get().then(getServiceResp => {
			if (getServiceResp) {
				logger.info("aliyun service faasit exists");
				return;
			} else {
				logger.info("aliyun service faasit doesn't exist, it will be created...")
				service.create().catch(err => {
					logger.error(err);
					return;
				});
			}
		}).catch(err => {
			logger.error(err);
		});


		let func = new AliyunFunction(
			fn.$ir.name,
			fn.output.codeDir,
			fn.output.runtime,
			fn.output.handler ? fn.output.handler : "index.handler",
			undefined
		)
		await func.get().then(async getFunctionResp => {
			if (getFunctionResp) {
				logger.info(`aliyun function ${fn.$ir.name} exists, it will be updated!`);
				logger.info('update function results: ');
				await func.update()
					.then(updateFunctionResp => {
						if (updateFunctionResp) {
							console.log(updateFunctionResp.body.toMap());
						}
					})
					.catch(err => {
						logger.error(err);
					})
			} else {
				logger.info(`create aliyun function ${fn.$ir.name}...`);
				logger.info('create function results: ');
				await func.create()
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

		for (let trigger of (fn.output.triggers || [])) {
			const baseTrigger = await Trigger.getTrigger({
				kind: trigger.kind,
				name: trigger.name,
				opts: {/**TODO */ }
			})
			let aliyunTrigger = new AliyunTrigger(
				fn.$ir.name,
				trigger.name,
				trigger.kind,
				{})
			await aliyunTrigger.get().then(async getTriggerResp => {
				if (getTriggerResp) {
					logger.info(`aliyun trigger ${trigger.name} exists, it will be updated!`);
					await aliyunTrigger.update()
						.then(updateTriggerResp => {
							if (updateTriggerResp) {
								logger.info("update trigger results: ");
								console.log(updateTriggerResp.body.toMap());
							}
						})
				} else {
					logger.info(`create trigger ${trigger.name}...`);
					await aliyunTrigger.create()
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
}

async function deployWorkflowApp(p: DeployParams, app: faas.WorkflowApplication) {
	const { ctx } = p;
	const { logger } = ctx

	logger.info(`deploy workflow on Aliyun`)
	const workflow = app.output.workflow.value.output

	const functionsToDeploy: DeployFunctionParams[] = []
	for (const fnRef of workflow.functions) {
		const fn = fnRef.value
		const codeDir = fn.output.codeDir

		functionsToDeploy.push({
			workflowFuncType: 'func',
			name: fnRef.value.$ir.name,
			codeDir: codeDir || workflow.codeDir
		})
	}

	functionsToDeploy.push({
		workflowFuncType: 'executor',
		name: 'executor',
		codeDir: workflow.codeDir
	})

	for (const func of functionsToDeploy) {
		const functionName = func.name
		const workflowFuncType = func.workflowFuncType
		const codeDir = func.codeDir

		let env = {
			FAASIT_PROVIDER: 'aliyun',
			FAASIT_APP_NAME: functionName,
			FAASIT_WORKFLOW_FUNC_TYPE: workflowFuncType,
			FAASIT_WORKFLOW_FUNC_NAME: functionName,
			ALIBABA_CLOUD_ACCESS_KEY_ID: process.env.accessID,
			ALIBABA_CLOUD_ACCESS_KEY_SECRET: process.env.accessKey,
			ALIBABA_CLOUD_PRODUCT_CODE: process.env.accountID,
			ALIBABA_CLOUD_REGION: process.env.region,
			ALIBABA_CLOUD_SERVICE: 'faasit'
		}

		let service = new AliyunService();
		await service.get().then(getServiceResp => {
			if (getServiceResp) {
				logger.info("aliyun service faasit exists");
				return;
			} else {
				logger.info("aliyun service faasit doesn't exist, it will be created...")
				service.create().catch(err => {
					logger.error(err);
					return;
				});
			}
		}).catch(err => {
			logger.error(err);
		});

		let aliyunFunc = new AliyunFunction(
			functionName,
			codeDir,
			'nodejs14',
			"index.handler",
			env);
		await aliyunFunc.get().then(async getFunctionResp => {
			if (getFunctionResp) {
				logger.info(`aliyun function ${functionName} exists, it will be updated!`);
				logger.info('update function results: ');
				await aliyunFunc.update()
					.then(updateFunctionResp => {
						if (updateFunctionResp) {
							console.log(updateFunctionResp.body.toMap());
						}
					})
					.catch(err => {
						logger.error(err);
					})
			} else {
				logger.info(`create aliyun function ${functionName}...`);
				logger.info('create function results: ');
				await aliyunFunc.create()
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
	}
}

export default function AliyunPlugin(): faas.ProviderPlugin {

	return {
		name: "aliyun",
		async deploy(input, ctx) {
			const { rt, logger } = ctx
			const { app } = input

			if (faas.isWorkflowApplication(app)) {
				return deployWorkflowApp({ ctx, input }, app)
			} else {
				return deployFunctions({ ctx, input })
			}
		},

		async invoke(input, ctx) {
			const { rt, logger } = ctx;
			const { app } = input;

			for (const fnRef of app.output.functions) {

				const fn = fnRef.value
				logger.info(`invoke function ${fn.$ir.name}`);
				const triggers = fn.output.triggers || []

				if (triggers.length > 0 && triggers[0].kind == 'http') {
					let aliyunTrigger = new AliyunTrigger(
						fn.$ir.name,
						triggers[0].name,
						'http',
						{}
					)
					await aliyunTrigger.get()
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
					let aliyunFunc = new AliyunFunction(
						fn.$ir.name,
						fn.output.codeDir,
						fn.output.runtime,
						fn.output.handler ? fn.output.handler : "index.handler",
						undefined
					)
					await aliyunFunc.invoke().then(resp => {
						if (resp) {
							logger.info(resp.body.toString());
						}
					})
				}
			}
		}
	}
}