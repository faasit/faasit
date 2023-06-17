import { faas } from './core'
import { AppError, ir, parser, URI } from '@faasit/core'
import { PluginContext } from './core/plugin'
import { OpenFaasPlugin } from './plugins/openfaas'
import fsp from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import { NodeFileSystemProvider } from './runtime'
import chalk from 'chalk'
import { spawn } from 'node:child_process'
import { readableToStream } from './utils'

export class Engine {
  constructor() {}

  async deploy(opts: { config: string; workingDir: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = this.getPlugin(app.defaultProvider.name)

    if (plugin.deploy) {
      await plugin.deploy({ app }, this.getPluginRuntime())
    }
  }

  async invoke(opts: { config: string; workingDir: string; func?: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = this.getPlugin(app.defaultProvider.name)

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
    const irSpecRes = await this.handleCompile(opts)

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

  private async resolveApplication(opts: {
    workingDir: string
    config: string
  }) {
    const extname = path.extname(opts.config)
    // yaml file
    if (['.yaml', '.yml'].includes(extname)) {
      const content = await fsp.readFile(opts.config, 'utf-8')
      const obj = yaml.load(content)
      return faas.parseApplication(obj)
    }

    // Faasit DSL file
    if (!['.ft'].includes(extname)) {
      throw new Error(`config should be ft, config=${opts.config}`)
    }

    const irSpecRes = await this.handleCompile({
      workingDir: opts.workingDir,
      file: opts.config,
    })

    if (!irSpecRes.ok) {
      throw new AppError(`failed to compile ${opts.config}`, {
        cause: irSpecRes.error,
      })
    }

    const irSpec = irSpecRes.value
    const irService = ir.makeIrService(irSpec)

    const applicationBlock = irSpec.modules[0].blocks.find(
      (b) => ir.types.isCustomBlock(b) && b.block_type === 'application'
    ) as ir.types.CustomBlock

    if (!applicationBlock) {
      throw new Error(`no @application block`)
    }

    const value = irService.convertToValue(applicationBlock)
    // console.debug(`[Debug] resolve application:`, value)
    return faas.parseApplication(value)
  }

  private getPlugin(name: string) {
    return OpenFaasPlugin()
  }

  private getPluginRuntime(): PluginContext {
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
            stdout: readableToStream(p.stdout),
            stderr: readableToStream(p.stderr),
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

  async handleCompile(opts: {
    workingDir: string
    file: string
  }): Promise<parser.ParseResult<ir.types.Spec>> {
    const file = path.resolve(opts.workingDir, opts.file)
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
