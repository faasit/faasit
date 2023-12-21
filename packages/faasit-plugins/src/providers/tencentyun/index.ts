import { faas } from '@faasit/std'
import { scf } from 'tencentcloud-sdk-nodejs-scf'
import path from 'path'
import {
  transformCreateFunctionParams,
  transformCreateTriggerParams,
  transformInvokeParams,
  transformUpdateFunctionParams,
} from './transformer'

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

      // get the set of function name to judge whether the function exists
      logger.info(`Trying to connect to Tencentyun SCF...`)
      const functionArray = (await client.ListFunctions({})).Functions
      const functionNameSet = new Set(
        functionArray.map((fn) => fn.FunctionName)
      )

      app.output.functions.forEach(async (fnRef) => {
        const fn = fnRef.value
        if (!functionNameSet.has(fn.$ir.name)) {
          // create function
          logger.info(`Create function ${fn.$ir.name}`)
          try {
            const params = transformCreateFunctionParams(fn)
            const result = await client.CreateFunction(params)
            logger.info(`Create function requestId: ${result.RequestId}`)
          } catch (err) {
            logger.error(`Error happens when creating function ${fn.$ir.name}`)
            logger.error(err)
            return
          }
        } else {
          // update the code of function
          logger.info(`Update function ${fn.$ir.name}`)
          try {
            const params = transformUpdateFunctionParams(fn)
            const result = await client.UpdateFunctionCode(params)
            logger.info(`Update function requestId: ${result.RequestId}`)
          } catch (err) {
            logger.error(`Error happens when updating function ${fn.$ir.name}`)
            logger.error(err)
            return
          }
        }

        // get the status of the function until ready
        let status
        while (
          status !== 'Active' &&
          status !== 'CreatFailed' &&
          status !== 'UpdatFailed'
        ) {
          status = (await client.GetFunction({ FunctionName: fn.$ir.name })).Status
          logger.info(`The status of function ${fn.$ir.name} is ${status}...`)
        }

        if (status === 'CreatFailed' || status === 'UpdatFailed') {
          logger.error(`The status of function ${fn.$ir.name} is ${status}`)
          return
        }

        // get all triggers
        const existTriggers = await client.ListTriggers({
          FunctionName: fn.$ir.name,
        })
        let triggerAmount = existTriggers.TotalCount
        if (triggerAmount) {
          // delete all triggers
          logger.info(`There are ${triggerAmount} triggers, deleting...`)
          existTriggers.Triggers?.forEach((trigger) => {
            logger.info(
              `Delete trigger ${trigger.TriggerName} of function ${fn.$ir.name}`
            )
            client.DeleteTrigger({
              FunctionName: fn.$ir.name,
              Type: trigger.Type,
              TriggerName: trigger.TriggerName,
            })
          })

          // wait the delete process done
          while (triggerAmount) {
            logger.info(
              `Deleteing, there are still ${triggerAmount} triggers...`
            )
            triggerAmount = (
              await client.ListTriggers({
                FunctionName: fn.$ir.name,
              })
            ).TotalCount
          }
        }

        // create trigger
        (fn.output.triggers || []).forEach(async (trigger) => {
          logger.info(`Create trigger ${trigger.name} of function ${fn.$ir.name}`)
          try {
            const params = transformCreateTriggerParams(trigger, fn.$ir.name)
            const result = await client.CreateTrigger(params)
            logger.info(`Create Trigger requestId: ${result.RequestId}`)
            console.log(result.TriggerInfo)
          } catch (err) {
            logger.error(
              `Error happens when creating trigger ${trigger.name} of function ${fn.$ir.name}`
            )
            logger.error(err)
          }
        })
      })
    },

    async invoke(input, ctx) {
      const { logger } = ctx

      logger.info(`Invoke function ${input.funcName}`)

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
