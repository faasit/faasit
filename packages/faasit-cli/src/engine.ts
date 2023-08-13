import {
  AppError,
  DiagnosticError,
  URI,
  ft_utils,
  ir,
  parser,
} from '@faasit/core'
import { faas } from '@faasit/std'
import chalk from 'chalk'
import yaml from 'js-yaml'
import fs from 'fs-extra';
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeFileSystemProvider } from './runtime'

const SCRIPT_DIR = path.normalize(path.dirname(fileURLToPath(import.meta.url)))
const ASSETS_DIR = path.resolve(SCRIPT_DIR, '../assets')

async function getProviderPlugin(name: string): Promise<faas.ProviderPlugin> {
  const { providers } = await import('@faasit/plugins')
  const plugins = {
    openfaas: () => providers.openfaas.default(),
    aliyun: () => providers.aliyun.default(),
    tencentyun: () => providers.tencentyun.default(),
    knative: () => providers.knative.default(),
  } as const

  const isPluginName = (name: string): name is keyof typeof plugins => {
    return name in plugins
  }

  if (isPluginName(name)) {
    return plugins[name]()
  }

  throw new AppError(`no provider plugin found, name=${name}`)
}

async function getGeneratorPlugin(name: string): Promise<faas.GeneratorPlugin> {
  const { generators } = await import('@faasit/plugins')

  const plugins = {
    js: () => generators.JavascriptGeneratorPlugin(),
  } as const

  const isPluginName = (name: string): name is keyof typeof plugins => {
    return name in plugins
  }

  if (isPluginName(name)) {
    return plugins[name]()
  }

  throw new AppError(`no generator plugin found, name=${name}`)
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(path)
    return stat.isDirectory()
  } catch (e) {
    return false;
  }
}

export class Engine {
  private logger: ft_utils.Logger
  constructor() {
    this.logger = {
      error(msg, options) {
        console.error(`[Error] ${msg}`, options?.error)
      },
      info(msg) {
        console.log(`[Info] ${msg}`)
      },
      warn(msg) {
        console.log(`[Warn] ${msg}`)
      },
    }
  }

  async init(opts: { workingDir: string; name: string; lang: string, template: string }) {
    const srcTemplateDir = path.join(ASSETS_DIR, 'templates', opts.template, opts.lang)

    if (!(await isDirectory(srcTemplateDir))) {
      throw new Error(`no such template=${opts.template}, lang=${opts.lang}`)
    }

    this.logger.info(`init project ${opts.name} defaultLanguage=${opts.lang} template=${opts.template}`)

    const projectDir = path.resolve(opts.workingDir, opts.name)

    if ((await isDirectory(projectDir))) {
      throw new Error(`project ${opts.name} already exists`)
    }

    await fs.mkdir(projectDir, { recursive: false })

    await fs.copy(srcTemplateDir, projectDir)

    this.logger.info(`create project ${projectDir}`)
  }

  async deploy(opts: { config: string; workingDir: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = await getProviderPlugin(app.defaultProvider.kind)

    if (plugin.deploy) {
      await plugin.deploy({ app }, this.getPluginRuntime())
    }
  }

  async invoke(opts: { config: string; workingDir: string; func?: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = await getProviderPlugin(app.defaultProvider.kind)

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
      this.printCompileError(irSpecRes.error)
      return
    }

    // just print ir currently
    console.log(
      yaml.dump(irSpecRes.value, {
        noRefs: true,
      })
    )
  }

  async eval(opts: { workingDir: string; file?: string }) {
    const irSpecRes = await this.handleCompile({ ...opts, config: opts.file || 'main.ft' })

    if (!irSpecRes.ok) {
      const diagErr = irSpecRes.error
      this.printCompileError(diagErr)
      return
    }

    const irSpec = irSpecRes.value
    const irService = ir.makeIrService(irSpec)

    const modules = irSpec.modules.map((module) => {
      const blocks = module.blocks.flatMap((b) => {
        if (ir.types.isCustomBlock(b)) {
          const value = irService.convertToValue(b) as object
          return [
            {
              $block_type: b.block_type,
              ...value,
            },
          ]
        }
        return []
      })

      return {
        kind: module.kind,
        name: module.id,
        blocks,
      }
    })

    console.log(
      yaml.dump(
        {
          modules,
        },
        {
          noRefs: true,
        }
      )
    )
  }

  async codegen(opts: { workingDir: string; file?: string; lang: string }) {
    const irSpecRes = await this.handleCompile({ ...opts, config: opts.file || 'main.ft' })

    if (!irSpecRes.ok) {
      this.printCompileError(irSpecRes.error)
      return
    }

    const irSpec = irSpecRes.value
    const app = await faas.resolveApplicationFromIr({ ir: irSpec })

    const generator = await getGeneratorPlugin(opts.lang)
    if (generator.generate) {
      const result = await generator.generate(
        { app, irSpec },
        this.getPluginRuntime()
      )

      this.logger.info(`Write the code generation results to the code/gen/`)

      await this.handleWriteGeneration({
        workingDir: opts.workingDir,
        generation: result,
      })
    }
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
          await fs.writeFile(path, content)
        },

        joinPath(...path) {
          return path.join(...path)
        },

        async removeFile(path) {
          await fs.unlink(path)
        },
      },
      logger: this.logger,
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

  async printCompileError(diagErr: DiagnosticError) {
    console.error(`failed to compile`)
    for (const error of diagErr.diags) {
      console.error(
        chalk.red(
          `line ${error.range.start.line}: ${error.message
          } [${diagErr.textDocument.getText(error.range)}]`
        )
      )
    }
    return
  }

  async handleWriteGeneration(opts: {
    workingDir: string
    generation: faas.GenerationResult
  }) {
    // collect all dirs
    const dirs = []

    for (const item of opts.generation.items) {
      dirs.push(path.resolve(opts.workingDir, path.dirname(item.path)))
    }

    // create dir
    await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })))

    // write files
    const tasks = opts.generation.items.map(async (item) => {
      const targetPath = path.resolve(opts.workingDir, item.path)
      await fs.writeFile(targetPath, item.content)
    })

    await Promise.all(tasks)
  }
}
