import { faas } from '@faasit/std'
import yaml from 'js-yaml'
import {exec} from 'child_process'


export default function LocalPlugin(): faas.ProviderPlugin {
    return {
        name: "local",
        async deploy(input, ctx) {
            const { rt, logger } = ctx
            const { app } = input

            logger.info(`local function deploy`)

            let services: Record<string,any> = {}
            services.master = {
                "image": "master-runtime:latest",
                "command": ["node", "/server/index.js"],
                "ports": ["9000:9000"],
                "container_name": "master"
            }
            for (const fnRef of app.output.functions) {
                const fn = fnRef.value
                logger.info(`deploy function ${fn.$ir.name}`)
                const funcName = fn.$ir.name
                const runtime = fn.output.runtime
                const codeDir = fn.output.codeDir
                let images_type = ""
                let command = []
                if (runtime == 'nodejs') {
                    images_type = "nodejs-runtime:latest"
                    command.push("node")
                    command.push("/nodejs14/src/server.js")
                }
                let service = {
                    "image" : images_type,
                    "volumes" : [`${codeDir}:/code`],
                    "command" : command,
                    "container_name" : funcName
                }
                services[funcName] = service
            }

            const docker_compose_obj = {
                "services" : services
            }
            await rt.writeFile("compose.yaml",yaml.dump(docker_compose_obj))

            const proc = rt.runCommand(
                `docker-compose up -d`
              )
            await Promise.all([
                proc.readOut(v => logger.info(v)),
                proc.readErr(v => logger.error(v))
            ])
            const { exitcode } = await proc.wait()

            if (exitcode == 0) {
                logger.info('Serverless Workflow deployed successfully')
                logger.info('Deployed URL: http://localhost:9000')
            } else {
                logger.error('Error')
            }

        },
        async invoke(input, ctx) {

        }

    }
}