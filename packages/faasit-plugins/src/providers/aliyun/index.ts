import { faas } from '@faasit/std'
import * as Trigger from "./utils/trigger";
import axios from "axios";
import { AliyunFunction, AliyunService, AliyunTrigger, AliyunSecretType, parseAliyunSecret } from './utils'
import { createClient } from './utils/client';


interface DeployParams {
	ctx: faas.ProviderPluginContext
	input: faas.ProviderDeployInput
	secret: AliyunSecretType
}

interface DeployFunctionParams {
	name: string,
	codeDir: string
}

class AliyunProvider implements faas.ProviderPlugin {
	name: string = 'aliyun'


	async deploy(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
		const { rt, logger } = ctx
		const { app } = input
		const secret = parseAliyunSecret(ctx.env)

		if (faas.isWorkflowApplication(app)) {
			return this.deployWorkflowApp({ ctx, input, secret }, app)
		} else {
			return this.deployFunctions({ ctx, input, secret })
		}
	}

	async invoke(input: faas.ProviderInvokeInput, ctx: faas.ProviderPluginContext) {
		const { rt, logger } = ctx;
		const { app } = input;
		const secret = parseAliyunSecret(ctx.env)
		const client = createClient({ secret })
		const serviceName = this.getServiceName(input.app)

		const fnName = app.output.workflow ? '__executor' : input.funcName
		const aliyunFunc = new AliyunFunction({
			client,
			serviceName,
			functionName: fnName,
			codeDir: "",
			runtime: 'nodejs14',
			handler: "index.handler",
			env: {
				FAASIT_PROVIDER: 'aliyun',
				FAASIT_APP_NAME: app.$ir.name,
				FAASIT_FUNC_NAME: fnName,
				FAASIT_WORKFLOW_FUNC_NAME: fnName,
				// use for commnuication between functions
				ALIBABA_CLOUD_ACCESS_KEY_ID: secret.accessKeyId,
				ALIBABA_CLOUD_ACCESS_KEY_SECRET: secret.accessKeySecret,
				ALIBABA_CLOUD_PRODUCT_CODE: secret.accountId,
				ALIBABA_CLOUD_REGION: secret.region,
				ALIBABA_CLOUD_SERVICE: serviceName,
				// OSS
				ALIBABA_CLOUD_OSS_BUCKET_NAME: process.env.ALIBABA_CLOUD_OSS_BUCKET_NAME, // faasit
				ALIBABA_CLOUD_OSS_REGION: process.env.ALIBABA_CLOUD_OSS_REGION, // oss-cn-hangzhou
			}
		})
		const resp = await aliyunFunc.invoke(input.input)
		logger.info("function invoke results:");
		console.log(resp?.body.toString());
		// const functions = app.output.workflow? : app
		// for (const fnRef of app.output.functions) {

		// 	const fn = fnRef.value
		// 	logger.info(`invoke function ${fn.$ir.name}`);
		// 	const triggers = fn.output.triggers || []

		// 	if (triggers.length > 0 && triggers[0].kind == 'http') {
		// 		let aliyunTrigger = new AliyunTrigger(
		// 			{
		// 				client,
		// 				serviceName,
		// 				functionName: fn.$ir.name,
		// 				triggerName: triggers[0].name,
		// 				triggerType: 'http',
		// 				triggerOpts: {},
		// 			}
		// 		)

		// 		const triggerResp = await aliyunTrigger.get()
		// 		const urlInternet = triggerResp?.body.urlInternet || "";
		// 		const urlWithoutHttp = urlInternet.replace(/^(http|https):\/\//, "");

		// 		const invokeResp = await axios.post(urlInternet, input.input)
		// 		logger.info("function invoke results:");
		// 		console.log(invokeResp.data);

		// 	} else {
		// 		let aliyunFunc = new AliyunFunction(
		// 			{
		// 				client,
		// 				serviceName,
		// 				functionName: fn.$ir.name,
		// 				codeDir: fn.output.codeDir,
		// 				runtime: fn.output.runtime,
		// 				handler: fn.output.handler ? fn.output.handler : "index.handler",
		// 			}
		// 		)
		// 		await aliyunFunc.invoke(input.input).then(resp => {
		// 			if (resp) {
		// 				logger.info(resp.body.toString());
		// 			}
		// 		})
		// 	}
		// }
	}

	async deployFunctions(p: DeployParams) {
		const { app } = p.input
		const { logger } = p.ctx
		logger.info('aliyun deploy')

		const serviceName = this.getServiceName(app)
		const client = createClient({ secret: p.secret })

		for (const fnRef of app.output.functions) {
			const fn = fnRef.value
			const functionName = fn.$ir.name
			logger.info(`deploy function ${fn.$ir.name}`)

			const service = new AliyunService({ client, serviceName });

			const getServiceResp = await service.get()
			if (!getServiceResp) {
				logger.info("aliyun service faasit doesn't exist, it will be created...")
				await service.create()
			}

			if (fn.output.runtime.includes('python')) {
				fn.output.runtime = 'python3.10'
			}
			if (fn.output.runtime.includes('nodejs')) {
				fn.output.runtime = 'nodejs16'
			}
			let func = new AliyunFunction({
				client,
				serviceName,
				functionName: fn.$ir.name,
				codeDir: fn.output.codeDir,
				runtime: fn.output.runtime,
				handler: fn.output.handler ? fn.output.handler : "index.handler",
				env: {
					FAASIT_PROVIDER: 'aliyun',
					FAASIT_APP_NAME: app.$ir.name,
					FAASIT_FUNC_NAME: functionName,
					FAASIT_WORKFLOW_FUNC_NAME: functionName,
					// OSS
					ALIBABA_CLOUD_OSS_BUCKET_NAME: process.env.ALIBABA_CLOUD_OSS_BUCKET_NAME, // faasit
					ALIBABA_CLOUD_OSS_REGION: process.env.ALIBABA_CLOUD_OSS_REGION, // oss-cn-hangzhou
				}
			})

			await func.get().then(async getFunctionResp => {
				if (getFunctionResp) {
					logger.info(`aliyun function ${fn.$ir.name} exists, it will be updated!`);
					const resp = await func.update()
					// logger.info('update function results: ');
					// console.log(resp?.body.toMap());
				} else {
					logger.info(`create aliyun function ${fn.$ir.name}...`);
					const resp = await func.create()
					// logger.info(`create function results: `);
					// console.log(resp?.body.toMap());
				}
			})

			for (let trigger of (fn.output.triggers || [])) {
				const baseTrigger = await Trigger.getTrigger({
					kind: trigger.kind,
					name: trigger.name,
					opts: {/**TODO */ }
				})

				let aliyunTrigger = new AliyunTrigger(
					{
						client,
						serviceName,
						functionName: fn.$ir.name,
						triggerName: trigger.name,
						triggerType: trigger.kind,
						triggerOpts: {}
					})

				await aliyunTrigger.get().then(async getTriggerResp => {
					if (getTriggerResp) {
						logger.info(`aliyun trigger ${trigger.name} exists, it will be updated!`);
						await aliyunTrigger.update()
					} else {
						logger.info(`create trigger ${trigger.name}...`);
						await aliyunTrigger.create()
					}
				})
			}

			logger.info(`aliyun deployed function ${functionName}`)
		}
	}

	async deployWorkflowApp(p: DeployParams, app: faas.WorkflowApplication) {
		const { ctx } = p;
		const { logger } = ctx

		logger.info(`deploy workflow on Aliyun`)
		const workflow = app.output.workflow.value.output

		const client = createClient({ secret: p.secret })
		const serviceName = this.getServiceName(app)

		const functionsToDeploy: DeployFunctionParams[] = []
		for (const fnRef of workflow.functions) {
			const fn = fnRef.value
			const codeDir = fn.output.codeDir

			functionsToDeploy.push({
				name: fnRef.value.$ir.name,
				codeDir: codeDir || workflow.codeDir
			})
		}

		functionsToDeploy.push({
			name: '__executor',
			codeDir: workflow.codeDir
		})

		for (const func of functionsToDeploy) {
			const functionName = func.name
			const codeDir = func.codeDir

			let env = {
				FAASIT_PROVIDER: 'aliyun',
				FAASIT_APP_NAME: app.$ir.name,
				FAASIT_FUNC_NAME: functionName,
				FAASIT_WORKFLOW_FUNC_NAME: functionName,
				// use for commnuication between functions
				ALIBABA_CLOUD_ACCESS_KEY_ID: p.secret.accessKeyId,
				ALIBABA_CLOUD_ACCESS_KEY_SECRET: p.secret.accessKeySecret,
				ALIBABA_CLOUD_PRODUCT_CODE: p.secret.accountId,
				ALIBABA_CLOUD_REGION: p.secret.region,
				ALIBABA_CLOUD_SERVICE: serviceName,
				// OSS
				ALIBABA_CLOUD_OSS_BUCKET_NAME: process.env.ALIBABA_CLOUD_OSS_BUCKET_NAME, // faasit
				ALIBABA_CLOUD_OSS_REGION: process.env.ALIBABA_CLOUD_OSS_REGION, // oss-cn-hangzhou
			}

			let service = new AliyunService({ client, serviceName });
			await service.get().then(getServiceResp => {
				if (getServiceResp) {
					logger.info(`aliyun service ${serviceName} exists`);
					return;
				} else {
					logger.info(`aliyun service ${serviceName} doesn't exist, it will be created...`)
					service.create().catch(err => {
						logger.error(err);
						return;
					});
				}
			}).catch(err => {
				logger.error(err);
			});

			let aliyunFunc = new AliyunFunction(
				{
					client,
					serviceName,
					functionName,
					codeDir,
					runtime: 'nodejs14',
					handler: "index.handler",
					env
				});
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

	private getServiceName(app: faas.Application) {
		// TODO: dynamic generate service name based on app name
		// return `faasit-${app.$ir.name}`
		return `faasit`
	}
}


export default function AliyunPlugin(): faas.ProviderPlugin {
	return new AliyunProvider()
}