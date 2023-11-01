import { faas } from '@faasit/std'
import axios from 'axios'
import yaml from 'js-yaml'

export default function KnativePlugin(): faas.ProviderPlugin {
  return {
    name: 'knative',
    async deploy(input, ctx) {
      const { rt, logger } = ctx
      const { app } = input

      logger.info(`deploy on knative`)

      const runOnce = async (fnRef: any) => {
        const fn = fnRef.value
        logger.info(`deploy function ${fn.$ir.name}`)

        const imageName = `${app.$ir.name}-${fn.$ir.name}`.toLowerCase()

        const registry = 'reg.i2ec.top'

        const funcObj = {
          specVersion: "0.35.0",
          name: imageName,
          runtime: "node",
          registry: `${registry}/cdd1037`,
          image: `${registry}/cdd1037/${imageName}:latest`,
          build: {
            builder: "pack",
            pvcSize: "256Mi",
            builderImages: {
              // pack: "reg.i2ec.top/library/ubuntu:20.04"
              // pack: "reg.i2ec.top/knative/builder-jammy-base:latest"
              // pack: "reg.i2ec.top/knative/builder-base-1:latest"
              pack: "reg.i2ec.top/builder/i2ec-builder2:latest"
            }
          },
          run: {
            envs: [
              {
                name: "FAASIT_PROVIDER",
                value: "knative"
              },
              {
                name: "FAASIT_APP_NAME",
                value: app.$ir.name
              },
            ]
          },
          deploy: {
            namespace: "faasit"
          }
        }

        const funcFile = `${fn.output.codeDir}/func.yaml`

        await rt.writeFile(funcFile, yaml.dump(funcObj))

        const proc = rt.runCommand(`kn func deploy -n faasit`, {
          cwd: fn.output.codeDir,
          shell: true,
          stdio: 'inherit'
        })

        await Promise.all([
          proc.readOut(v => logger.info(v)),
          proc.readErr(v => logger.error(v))
        ])
        await proc.wait()

        logger.info(`deployed function ${fn.$ir.name}`)
      }

      const tasks = app.output.functions.map(
        fn => runOnce(fn)
      )
      
      await Promise.all(tasks)


    },

    async invoke(input, ctx) {
      const { rt, logger } = ctx
      const { app } = input

      logger.info(`invoke function ${input.funcName}`)

      const svcName = `${app.$ir.name}-${input.funcName}`

      const url = `http://${svcName}.faasit.192.168.1.240.sslip.io`

      const resp = await axios.get(url)

      console.log(resp.data)

      logger.info(`invoked function ${input.funcName}`)
    },
  }
}
