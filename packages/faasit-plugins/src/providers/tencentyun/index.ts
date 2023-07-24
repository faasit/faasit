import { faas } from '@faasit/std'
import { scf } from 'tencentcloud-sdk-nodejs-scf'
import path from 'path'
import dotenv from 'dotenv'
import {
  transformCreateFunctionParams,
  transformCreateTriggerParams,
  transformInvokeParams,
} from './transformer'

dotenv.config({ path: path.resolve(__dirname, './.env') })
const ScfClient = scf.v20180416.Client

export default function TencentyunPlugin(): faas.ProviderPlugin {
  const client = new ScfClient({
    credential: {
      secretId: process.env.TENCENTYUN_SECRET_ID,
      secretKey: process.env.TENCENTYUN_SECRET_KEY,
    },
    region: process.env.TENCENTYUN_REGION,
  })

  return {
    name: 'tencentyun',
    async deploy(input, ctx) {
      const { logger } = ctx
      const { app } = input

      logger.info(`Tencentyun deploy`)

      // get the set of function name
      logger.info(`Trying to connect to Tencentyun SCF...`)
      const functionArray = (await client.ListFunctions({})).Functions
      const functionNameSet = new Set(
        functionArray.map((fn) => fn.FunctionName)
      )

      for (const fn of app.functions) {
        if (functionNameSet.has(fn.name)) {
          // TODO: update code of the function
          logger.info(`Update the code of function ${fn.name}`)
          return
        } else {
          // create function
          logger.info(`Create function ${fn.name}`)
          try {
            const params = transformCreateFunctionParams(fn)
            const result = await client.CreateFunction(params)
            logger.info(`Create function requestId: ${result.RequestId}`)
          } catch (err) {
            logger.error(`Error happens when creating function ${fn.name}`)
            logger.error(err)
            continue
          }
        }

        // get the status of the function until ready
        let status
        while (
          status !== 'Active' &&
          status !== 'CreatFailed' &&
          status !== 'UpdatFailed'
        ) {
          status = (await client.GetFunction({ FunctionName: fn.name })).Status
          logger.info(`Waiting, the status of function ${fn.name} is ${status}...`)
        }

        if (status === 'CreatFailed' || status === 'UpdatFailed') {
          logger.error(`The status of function ${fn.name} is ${status}`)
          continue
        }

        // create trigger
        for (const trigger of fn.triggers) {
          logger.info(`create trigger ${trigger.name} of function ${fn.name}`)
          try {
            const params = transformCreateTriggerParams(trigger, fn.name)
            const result = await client.CreateTrigger(params)
            logger.info(`Create Trigger requestId: ${result.RequestId}`)
            console.log(result.TriggerInfo);
          } catch (err) {
            logger.error(
              `Error happens when creating trigger ${trigger.name} of function ${fn.name}`
            )
            logger.error(err)
            continue
          }
        }
      }
    },

    async invoke(input, ctx) {
      const { logger } = ctx

      logger.info(`invoke function ${input.funcName}`)

      // invoke funtion
      const params = transformInvokeParams(input.funcName)
      try {
        const result = await client.Invoke(params)
        logger.info(`Invoke requestId: ${result.RequestId}`)
        console.info(result.Result)
      } catch (err) {
        logger.error(`Error happens when invoking function ${input.funcName}`)
        logger.error(err)
      }
    },
  }
}
