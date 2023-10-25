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

      for (const fnRef of app.output.functions) {
        const fn = fnRef.value
        logger.info(`deploy function ${fn.$ir.name}`)

        const imageName = `${app.$ir.name}-${fn.$ir.name}`.toLowerCase()

        const funcObj = {
          specVersion: "0.35.0",
          name: imageName,
          runtime: "node",
          registry: "reg.i2ec.top/funcs",
          image: `reg.i2ec.top/funcs/${imageName}:latest`,
          build: {
            builder: "pack",
            pvcSize: "256Mi"
          },
          deploy: {
            namespace: "faasit"
          }
        }

        const funcFile = `code/func.yaml`

        await rt.writeFile(funcFile, yaml.dump(funcObj))

        const proc = rt.runCommand(`kn func deploy`, {
          cwd: 'code',
          shell: true,
          stdio: 'inherit'
        })

        await Promise.all(
          [proc.stdout, proc.stderr].map(async (v) => {
            if (!v) {
              return;
            }

            for await (const chunk of v) {
              logger.info(chunk)
            }
          })
        )
        await proc.wait()

        logger.info(`deployed function ${fn.$ir.name}`)
      }
    },

    async invoke(input, ctx) {
      const { rt, logger } = ctx
      const { app } = input

      logger.info(`invoke function ${input.funcName}`)

      const svcName = `${app.$ir.name}-${input.funcName}`

      const url = `http://${svcName}.knative-serving.192.168.1.240.sslip.io`

      const resp = await axios.get(url)

      console.log(resp.data)

      logger.info(`invoked function ${input.funcName}`)
    },
  }
}
