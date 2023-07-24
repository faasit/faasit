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

      logger.info(`tencentyun deploy`)

      for (const fn of app.functions) {
        // TODO: get the status of the function, if the function exists, update it

        // create function
        logger.info(`create function ${fn.name}`)
        try {
          const params = transformCreateFunctionParams(fn)
          const result = await client.CreateFunction(params)
          logger.info(`RequestId: ${result.RequestId}`)
        } catch (err) {
          logger.error(`Error happens when creating function ${fn.name}`)
          logger.error(err)
          continue
        }

        // TODO: get the status of the function until ready
        
        // TODO: get the status of trigger, if the trigger exists, update it
        
        // create trigger
        for (const trigger of fn.triggers) {
          logger.info(`create trigger ${trigger.name} of function ${fn.name}`)
          try {
            const params = transformCreateTriggerParams(trigger, fn.name)
            const result = await client.CreateTrigger(params)
            logger.info(`RequestId: ${result.RequestId}`)
          } catch (err) {
            logger.error(`Error happens when creating trigger ${trigger.name} of function ${fn.name}`)
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
        logger.info(`RequestId: ${result.RequestId}`)
        console.info(result.Result)
      } catch (err) {
        logger.error(`Error happens when invoking function ${input.funcName}`)
        logger.error(err)
      }
    },
  }
}
