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
import S2A from 'stream-to-async-iterator'
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
    local: () => providers.local.default(),
    'local-once': () => providers.local_once.default(),
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

  async deploy(opts: { config: string; workingDir: string; provider?: string }) {
    const app = await this.resolveApplication(opts)
    let provider = app.output.defaultProvider.value

    if (opts.provider) {
      throw new Error(`not implemented to select provider dynamically`)
    }

    const plugin = await getProviderPlugin(app.output.defaultProvider.value.output.kind)

    if (plugin.deploy) {
      await plugin.deploy({ app, provider }, this.getPluginRuntime(opts))
    }
  }

  async run(opts: { config: string, workingDir: string, 'input.value': string }) {
    const rt = this.getPluginRuntime(opts)
    const app = await this.resolveApplication(opts)

    // use local-once provider to simulate run locally
    const providerKind = `local-once`

    // use input examples as default
    let value = app.output.inputExamples[0]?.value
    if (opts['input.value']) {
      value = JSON.parse(opts['input.value'])
    }

    if (value == undefined) {
      rt.logger.warn(`no input value provided, use '--input.value' to specify the input value in json format`)
    }

    const provider = {
      '$ir': {
        kind: 'b_custom',
        block_type: {
          '$ir': { kind: 'r_ref', id: 'provider' },
          value: { $ir: { kind: 'b_block', name: 'provider', props: [] } }
        },
        name: '',
        props: []
      },
      output: {
        kind: providerKind,
        input: {
          value
        }
      }
    } as faas.Provider

    const plugin = await getProviderPlugin(providerKind)

    if (plugin.deploy) {
      await plugin.deploy({ app, provider }, rt)
    }
  }

  async invoke(opts: { config: string; workingDir: string; func?: string }) {
    const app = await this.resolveApplication(opts)

    const plugin = await getProviderPlugin(app.output.defaultProvider.value.output.kind)

    if (plugin.invoke) {
      let funcName = opts.func
      if (!funcName) {
        // get first function
        funcName = app.output.functions[0].value.$ir.name
      }
      await plugin.invoke({ app, funcName }, this.getPluginRuntime())
    }
  }

  async eval(opts: { workingDir: string; file?: string; ir: boolean; check: boolean, lazy: boolean }) {
    const irSpecRes = await this.handleCompile({ ...opts, config: opts.file || 'main.ft' })

    if (!irSpecRes.ok) {
      const diagErr = irSpecRes.error
      this.printCompileError(diagErr)
      return
    }

    const irSpec = irSpecRes.value
    let yamlOpts: yaml.DumpOptions = {}
    if (opts.lazy) {
      yamlOpts = {
        noRefs: true,
        replacer(key, value) {
          // not print ir
          if (!opts.ir && key == '$ir') {
            return undefined
          }

          // may contains loop reference to cause infinite loop
          // so just print as <lazy_evaluation>
          if (ir.types.isReference(value)) {
            return {
              $ir: value.$ir,
              value: '<lazy_evaluation>'
            }
          }

          return value
        },
      }
    }

    console.log(
      yaml.dump(
        irSpec,
        yamlOpts
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
        this.getPluginRuntime(opts)
      )

      this.logger.info(`Write the code generation results to the code/gen/`)

      await this.handleWriteGeneration({
        workingDir: opts.workingDir,
        generation: result,
      })
    }
  }

  private getPluginRuntime(opts: { workingDir: string }): faas.ProviderPluginContext {
    return {
      cwd: opts.workingDir,
      rt: {
        runCommand(cmd, options) {
          const { args = [], ...rest } = options || {}
          const p = spawn(cmd, args, {
            ...(rest || {})
          })

          const isStdioInherit = rest.stdio && rest.stdio == 'inherit'

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

          const streamStdout = p.stdout ? new S2A<string>(p.stdout) : null
          const streamStderr = p.stderr ? new S2A<string>(p.stderr) : null

          const readStream = async (stream: S2A<string> | null, cb: (v: string) => void): Promise<void> => {
            if (!stream) {
              return
            }

            for await (const chunk of stream) {
              cb(chunk)
            }
          }

          return {
            wait,
            stdout: streamStdout,
            stderr: streamStderr,

            async readOut(cb) {
              return readStream(streamStdout, cb)
            },

            async readErr(cb) {
              return readStream(streamStderr, cb)
            },
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

        async fileExists(path) {
          try {
            const stat = await fs.lstat(path)
            return stat.isFile()
          } catch (e) {
            return false
          }
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
    check?: boolean
  }): Promise<ft_utils.Result<ir.Spec, DiagnosticError>> {
    const file = path.resolve(opts.workingDir, opts.config)
    const fileUri = URI.file(file)

    const parseResult = await parser.parse({
      file: fileUri,
      fileSystemProvider: () => new NodeFileSystemProvider(),
      check: opts.check || false
    })

    if (!parseResult.ok) {
      return parseResult
    }

    const inst = parseResult.value

    // just print as ir currently
    const irSpec = await ir.convertFromAst({ mainInst: inst })
    ir.evaluateIR({ spec: irSpec })

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
