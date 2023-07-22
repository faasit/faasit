import { faas } from '@faasit/std'
import { scf } from 'tencentcloud-sdk-nodejs-scf'
import Admzip from 'adm-zip'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, './.env') })
const ScfClient = scf.v20180416.Client

function zipFolderAndEncode(folderPath: string) {
  const zip = new Admzip()
  zip.addLocalFolder(folderPath)
  const zipBuffer = zip.toBuffer()
  const base64 = zipBuffer.toString('base64')
  return base64
}

export default function TencentyunPlugin(): faas.ProviderPlugin {
  const client = new ScfClient({
    credential: {
      secretId: process.env.SECRET_ID,
      secretKey: process.env.SECRET_KEY,
    },
    region: process.env.REGION,
  })

  return {
    name: 'tencentyun',
    async deploy(input, ctx) {
      const { logger } = ctx
      const { app } = input

      logger.info(`tencentyun deploy`)

      for (const fn of app.functions) {
        logger.info(`deploy function ${fn.name}`)

        const params = {
          FunctionName: fn.name,
          Code: {
            ZipFile: zipFolderAndEncode(fn.codeDir),
          },
          Runtime: fn.runtime,
        }

        client.CreateFunction(params).then(
          (data) => {
            logger.info(`RequestId: ${data.RequestId}`)
          },
          (err) => {
            logger.error(`Error happens when creating function ${fn.name}`)
            logger.error(err)
          }
        )
      }
    },

    async invoke(input, ctx) {
      const { logger } = ctx

      logger.info(`invoke function ${input.funcName}`)

      const params = {
        FunctionName: input.funcName,
        ClientContext: JSON.stringify({
          eventMessage: '123',
        }),
      }

      client.Invoke(params).then(
        (data) => {
          logger.info(`RequestId: ${data.RequestId}`)
          console.info(data.Result)
        },
        (err) => {
          logger.error(err)
        }
      )
    },
  }
}
