import { faas } from '@faasit/std'
import yaml from 'js-yaml'
import axios from 'axios'
import { spawn } from 'child_process'

class LocalProvider implements faas.ProviderPlugin {
    name: string = "local"


    async deployWorkflow(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
        const { rt, logger } = ctx
        const { app } = input

        logger.info(`local workflow deploy`)
        const workflow = app.output.workflow?.value
        if (workflow) {
            let services: Record<string, any> = {}
            services.master = {
                "image": "master-runtime:latest",
                "volumes": [`./config.json:/server/config.json`],
                "command": ["node", "/server/index.js"],
                "ports": ["9000:9000"],
                "container_name": "master"
            }

            logger.info(`deploy executor`)
            
            let config: Record<string, any> = {}
            let currentPort = 9001
            const codeDir = workflow.output.codeDir
            services['executor'] = {
                "image": "nodejs-runtime:latest",
                "volumes": [`${codeDir}:/code`],
                "command": ["node", "/nodejs14/src/server.js"],
                "container_name": "executor",
                "environment": {
                    "FAASIT_FUNC_NAME": "__executor",
                    "FAASIT_PROVIDER": "local",
                    "FAASIT_WORKFLOW_FUNC_NAME": "__executor"
                }
            }
            config['executor'] = currentPort++
            for (const fnRef of workflow.output.functions) {
                const fn = fnRef.value
                logger.info(`deploy function ${fn.$ir.name}`)
                const funcName = fn.$ir.name
                const runtime = fn.output.runtime
                let images_type = ""
                let command = []
                if (runtime == 'nodejs' || runtime == 'nodejs16') {
                    images_type = "nodejs-runtime:latest"
                    command.push("node")
                    command.push("/nodejs14/src/server.js")
                }
                let service = {
                    "image": images_type,
                    "volumes": [`${codeDir}:/code`],
                    "command": command,
                    "container_name": funcName,
                    "environment": {
                        "FAASIT_FUNC_NAME": funcName,
                        "FAASIT_PROVIDER": "local",
                    }
                }
                services[funcName] = service
                config[funcName] = currentPort++
            }

            const docker_compose_obj = {
                "services": services
            }
            config = {
                'service': config
            }
            await rt.writeFile("config.json", JSON.stringify(config))
            await rt.writeFile("compose.yaml", yaml.dump(docker_compose_obj))

            const output = await new Promise((resolve, reject) => {
                const docker_compose = spawn('docker-compose', ['up', '-d'], { cwd: process.cwd() })
                let data = ''
                docker_compose.stdout.on('data', (chunk) => {
                    data += chunk
                })
                docker_compose.stderr.on('data', (chunk) => {
                    reject(chunk.toString())
                })
                docker_compose.on('close', () => {
                    resolve(data)
                })
            })

        }

    }

    async deployFunctions(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
        const { rt, logger } = ctx
        const { app } = input

        logger.info(`local function deploy`)
        let services: Record<string, any> = {}
        services.master = {
            "image": "master-runtime:latest",
            "volumes": [`./config.json:/server/config.json`],
            "command": ["node", "/server/index.js"],
            "ports": ["9000:9000"],
            "container_name": "master"
        }
        let config: Record<string, any> = {}
        let currentPort = 9001
        for (const fnRef of app.output.functions) {
            const fn = fnRef.value
            logger.info(`deploy function ${fn.$ir.name}`)
            const funcName = fn.$ir.name
            const runtime = fn.output.runtime
            const codeDir = fn.output.codeDir
            let images_type = ""
            let command = []
            if (runtime == 'nodejs' || runtime == 'nodejs16') {
                images_type = "nodejs-runtime:latest"
                command.push("node")
                command.push("/nodejs14/src/server.js")
            }
            let service = {
                "image": images_type,
                "volumes": [`${codeDir}:/code`],
                "command": command,
                "container_name": funcName,
                "environment": {
                    "FAASIT_FUNC_NAME": funcName,
                    "FAASIT_PROVIDER": "local",
                }
            }
            services[funcName] = service
            config[funcName] = currentPort++
        }

        const docker_compose_obj = {
            "services": services
        }
        config = {
            'service': config
        }
        await rt.writeFile("config.json", JSON.stringify(config))
        await rt.writeFile("compose.yaml", yaml.dump(docker_compose_obj))

        const output = await new Promise((resolve, reject) => {
            const docker_compose = spawn('docker-compose', ['up', '-d'], { cwd: process.cwd() })
            let data = ''
            docker_compose.stdout.on('data', (chunk) => {
                data += chunk
            })
            docker_compose.stderr.on('data', (chunk) => {
                reject(chunk.toString())
            })
            docker_compose.on('close', () => {
                resolve(data)
            })
        })
    }
    async deploy(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
        const { rt, logger } = ctx
        const { app } = input

        logger.info(`local function deploy`)
        if (faas.isWorkflowApplication(app)) {
            return this.deployWorkflow(input, ctx)
        } else {
            return this.deployFunctions(input, ctx)
        }

    }
    async invoke(input: faas.ProviderInvokeInput, ctx: faas.ProviderPluginContext) {
        const { rt, logger } = ctx
        const { app, funcName } = input

        logger.info(`local function invoke`)
        logger.info(`input: ${JSON.stringify(input.input)}`)

        const axiosInstance = axios.create()
        const url = `http://localhost:9000/${funcName}`
        const resp = await axiosInstance.post(url, input.input ? input.input : {})
        console.log(resp.data);
    }
}

export default function LocalPlugin(): faas.ProviderPlugin {
    return new LocalProvider()
}