import { faas } from './core'
import { ir } from './core/ir'
import { PluginContext } from './core/plugin'
import { OpenFaasPlugin } from './plugins/openfaas'
import { exec } from 'child_process'
import { promisify } from 'node:util'
import fsp from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'

const execp = promisify(exec)

export interface BaseOptions {
  config: string
  workingDir: string
}

export class Engine {
  constructor() {}

  async deploy(opts: BaseOptions) {
    const app = await this.resolveApplication(opts.config)
    console.log(`using app`, app)

    const plugin = this.getPlugin(app.provider.name)

    if (plugin.deploy) {
      await plugin.deploy({ app }, this.getPluginRuntime())
    }
  }

  async invoke(opts: BaseOptions & { func?: string }) {
    const app = await this.resolveApplication(opts.config)

    const plugin = this.getPlugin(app.provider.name)

    if (plugin.invoke) {
      let funcName = opts.func
      if (!funcName) {
        // get first function
        funcName = app.functions[0].name
      }
      await plugin.invoke({ app, funcName }, this.getPluginRuntime())
    }
  }

  private async resolveApplication(configPath: string) {
    const extname = path.extname(configPath)
    if (extname === '.ft') {
      throw new Error(`not support faasit DSL currently`)
    }

    if (extname === '.yaml' || extname === '.yml') {
      const content = await fsp.readFile(configPath)
      const obj = yaml.load(content.toString())
      return faas.parseApplication(obj)
    }

    throw new Error(`unsupport file format: ${configPath}`)
  }

  private compile(fileUri: string): ir.Spec {
    const spec: ir.Spec = {
      version: '0.0.1',
      modules: [
        {
          id: '__main__',
          kind: 'm_inline',
          blocks: [],
        },
      ],
    }

    return ir.validateSpec(spec)
  }

  private getPlugin(name: string) {
    return OpenFaasPlugin()
  }

  private getPluginRuntime(): PluginContext {
    return {
      rt: {
        async runCommand(cmd) {
          const data = await execp(cmd)
          return data
        },

        async writeFile(path, content) {
          await fsp.writeFile(path, content)
        },

        joinPath(...path) {
          return path.join(...path)
        },

        async removeFile(path) {
          await fsp.unlink(path)
        },
      },
      logger: {
        error(msg, options) {
          console.error(`[Error] ${msg}`, options?.error)
        },
        info(msg) {
          console.log(`[Info] ${msg}`)
        },
        warn(msg) {
          console.log(`[Warn] ${msg}`)
        },
      },
    }
  }
}
