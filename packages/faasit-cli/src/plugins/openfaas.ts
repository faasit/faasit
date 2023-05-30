import { Plugin } from '../core/plugin'

import yaml from 'js-yaml'

export function OpenFaasPlugin(): Plugin {
  const gateway = 'https://openfaas-ft.i2ec.top'

  return {
    name: 'openfaas',
    async deploy(input, ctx) {
      const { rt, logger } = ctx
      const { app } = input

      logger.info(`openfaas deploy`)

      for (const fn of app.functions) {
        logger.info(`deploy function ${fn.name}`)

        // const output = await rt.runCommand(
        //   `faas-cli deploy -g ${gateway} --lang node --handler ${fn.codeDir} --name ${fn.name} --image hello-world:latest`
        // )

        const stackObj = {
          version: '1.0',
          provider: {
            name: 'openfaas',
            gateway,
          },
          functions: {
            [fn.name]: {
              lang: 'node',
              handler: fn.codeDir,
              image: `reg.i2ec.top/faasit/${fn.name}:latest`,
            },
          },
        }

        const stackFile = `stack.tmp.yaml`

        // write to stack.yaml
        await rt.writeFile(stackFile, yaml.dump(stackObj))

        const output = await rt.runCommand(`faas-cli up -f ${stackFile}`)

        await rt.removeFile(stackFile)

        logger.info(output.stdout)
      }
    },

    async invoke(input, ctx) {
      const { rt, logger } = ctx

      logger.info(`invoke function ${input.funcName}`)

      const output = await rt.runCommand(
        `echo "" | faas-cli invoke ${input.funcName} -g ${gateway}`
      )

      logger.info(output.stdout)
    },
  }
}
