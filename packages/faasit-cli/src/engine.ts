import {
  AppError,
  ir,
  parser,
  URI,
  ft_utils,
  DiagnosticError,
} from '@faasit/core'
import chalk from 'chalk'
import yaml from 'js-yaml'
import { spawn } from 'node:child_process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { NodeFileSystemProvider } from './runtime'
import { faas } from '@faasit/std'

import { providers } from '@faasit/plugins'

async function getProviderPlugin(name: string): Promise<faas.ProviderPlugin> {
  const plugins = {
    openfaas: () => providers.openfaas.default(),
    aliyun: ()=> providers.aliyun.default(),
  } as const

  const isPluginName = (name: string): name is keyof typeof plugins => {
    return name in plugins
  }

  if (isPluginName(name)) {
    return plugins[name]()
  }

  throw new AppError(`no provider plugin found, name=${name}`)
}

export class Engine {
  constructor() {}

  async deploy(opts: { config: string; workingDir: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = await getProviderPlugin(app.defaultProvider.kind)

    if (plugin.deploy) {
      await plugin.deploy({ app }, this.getPluginRuntime())
    }
  }

  async invoke(opts: { config: string; workingDir: string; func?: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = await getProviderPlugin(app.defaultProvider.name)

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
    const irSpecRes = await this.handleCompile({ ...opts, config: opts.file })

    if (!irSpecRes.ok) {
      const diagErr = irSpecRes.error
      console.error(`failed to compile ${opts.file}`)
      for (const error of diagErr.diags) {
        console.error(
          chalk.red(
            `line ${error.range.start.line}: ${
              error.message
            } [${diagErr.textDocument.getText(error.range)}]`
          )
        )
      }
      return
    }

    // just print ir currently
    console.log(yaml.dump(irSpecRes.value))
  }

  private getPluginRuntime(): faas.ProviderPluginContext {
    return {
      rt: {
        runCommand(cmd) {
          const p = spawn(cmd, {
            shell: true,
          })

          const wait: () => Promise<{ exitcode: number }> = () =>
            new Promise((resolve, reject) => {
              p.once('error', (err) => {
                reject(err)
              })

              p.once('exit', (code) => {
                resolve({
                  exitcode: code || 0,
                })
              })
            })

          return {
            wait,
            stdout: ft_utils.readableToStream(p.stdout),
            stderr: ft_utils.readableToStream(p.stderr),
          }
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

  async resolveApplication(opts: {
    config: string
    workingDir: string
  }): Promise<faas.Application> {
    const irResult = await this.handleCompile(opts)

    if (!irResult.ok) {
      throw new AppError(`failed to compile, e`, { cause: irResult.error })
    }
    return await faas.resolveApplicationFromIr({ ir: irResult.value })
  }

  async handleCompile(opts: {
    workingDir: string
    config: string
  }): Promise<ft_utils.Result<ir.Spec, DiagnosticError>> {
    const file = path.resolve(opts.workingDir, opts.config)
    const fileUri = URI.file(file)

    const parseResult = await parser.parse({
      file: fileUri,
      fileSystemProvider: () => new NodeFileSystemProvider(),
    })

    if (!parseResult.ok) {
      return parseResult
    }

    const module = parseResult.value

    // just print as ir currently
    const irSpec = await ir.convertFromAst({ main: module })
    return { ok: true, value: irSpec }
  }
}
