import { faas } from './core'
import { ir, parser, URI } from '@faasit/core'
import { PluginContext } from './core/plugin'
import { OpenFaasPlugin } from './plugins/openfaas'
import { exec } from 'child_process'
import { promisify } from 'node:util'
import fsp from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import { NodeFileSystemProvider } from './runtime'
import chalk from 'chalk'

const execp = promisify(exec)

export class Engine {
  constructor() {}

  async deploy(opts: { config: string; workingDir: string }) {
    const app = await this.resolveApplication(opts.config)
    console.log(`using app`, app)

    const plugin = this.getPlugin(app.provider.name)

    if (plugin.deploy) {
      await plugin.deploy({ app }, this.getPluginRuntime())
    }
  }

  async invoke(opts: { config: string; workingDir: string; func?: string }) {
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

  async compile(opts: { workingDir: string; file: string }) {
    const file = path.resolve(path.join(opts.workingDir, opts.file))
    const fileUri = URI.file(file)

    const parseResult = await parser.parse({
      file: fileUri,
      fileSystemProvider: () => new NodeFileSystemProvider(),
    })

    if (parseResult.errors.length > 0) {
      console.error(`failed to compile ${opts.file}`)
      for (const error of parseResult.errors) {
        console.error(
          chalk.red(
            `line ${error.range.start.line}: ${
              error.message
            } [${parseResult.textDocument.getText(error.range)}]`
          )
        )
      }
      return
    }

    const module = parseResult.parsedValue

    // just print as ir currently
    const irSpec = await ir.convertFromAst({ main: module })
    console.log(yaml.dump(irSpec))
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
