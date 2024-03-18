import {
  AppError,
  CheckOptions,
  DiagnosticError,
  URI,
  ft_utils,
  ir,
  parser,
} from '@faasit/core';
import { faas } from '@faasit/std';
import chalk from 'chalk';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import S2A from 'stream-to-async-iterator';
import { NodeFileSystemProvider } from './runtime';
import { RunPerf } from './utils';

const SCRIPT_DIR = path.normalize(path.dirname(fileURLToPath(import.meta.url)))
const ASSETS_DIR = path.resolve(SCRIPT_DIR, '../assets')

async function getProviderPlugin(name: string): Promise<faas.ProviderPlugin> {
  const validProviders = ['aliyun', 'tencentyun', 'knative', 'aws', 'local', 'local-once']

  if (!validProviders.includes(name)) {
    throw new AppError(`no provider plugin found, name=${name}`)
  }

  const moduleId = `@faasit/plugins/providers/${name}`

  const module = await import(moduleId)
  return module.default()
}

async function getGeneratorPlugin(name: string): Promise<faas.GeneratorPlugin> {
  const validGenerators = ['nodejs']

  if (!validGenerators.includes(name)) {
    throw new AppError(`no generator plugin found, name=${name}`)
  }

  const moduleId = `@faasit/plugins/generators/${name}`

  const module = await import(moduleId)
  return module.default()
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(path)
    return stat.isDirectory()
  } catch (e) {
    return false;
  }
}

interface GlobalOptions {
  workingDir: string
  dev_perf: boolean
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

  async init(opts: { name: string; lang: string, template: string } & GlobalOptions) {
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

  async deploy(opts: { config: string; provider?: string } & GlobalOptions) {
    const app = await this.resolveApplication(opts)
    const provider = await this.handleGetProvider({ app, provider: opts.provider })
    const plugin = await getProviderPlugin(provider.output.kind)

    if (plugin.deploy) {
      await plugin.deploy({ app, provider }, this.getPluginRuntime(opts))
    }
  }

  async run(opts: { config: string, 'input.value': string, example: number } & GlobalOptions) {
    const rt = this.getPluginRuntime(opts)
    const app = await this.resolveApplication(opts)

    // use local-once provider to simulate run locally
    const providerKind = `local-once`

    const value = await this.handleGetInputValue({
      rt,
      app,
      inputValue: opts['input.value'],
      example: opts.example
    })

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

  async invoke(opts: { config: string; func?: string; provider?: string; example: number } & GlobalOptions) {
    const app = await this.resolveApplication(opts)
    const provider = await this.handleGetProvider({ app, provider: opts.provider })
    const plugin = await getProviderPlugin(provider.output.kind)
    const rt = this.getPluginRuntime(opts)

    const input = await this.handleGetInputValue({
      rt,
      app,
      example: opts.example
    })

    if (plugin.invoke) {
      let funcName = opts.func
      if (!funcName) {
        // get first function
        funcName = app.output.functions[0].value.$ir.name
      }
      await plugin.invoke({ app, funcName, input }, rt)
    }
  }

  async devView(opts: { config: string, symbolTable: boolean } & GlobalOptions) {
    const compileRes = await this.handleCompile({
      ...opts
    })

    if (!compileRes.ok) {
      const diagErr = compileRes.error
      this.printCompileError(diagErr)
      return
    }

    const irSpec = compileRes.value.irSpec
    if (opts.symbolTable) {
      console.log(irSpec.symbols)
    }
  }

  async convert(opts: {} & GlobalOptions) { }

  async eval(opts: { config: string; ir: boolean; checkParse: boolean, checkSymbols: boolean, lazy: boolean } & GlobalOptions) {
    const compileRes = await this.handleCompile({
      ...opts, check: {
        checkParse: opts.checkParse,
        checkSymbols: opts.checkSymbols,
      }
    })

    if (!compileRes.ok) {
      const diagErr = compileRes.error
      this.printCompileError(diagErr)
      return
    }

    const irSpec = compileRes.value.irSpec
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

  async format(opts: { config: string } & GlobalOptions) {
    const perfRes = await RunPerf(async () => {
      const file = path.resolve(opts.workingDir, opts.config)
      const fileUri = URI.file(file)

      const manager = new parser.LspManager({
        fileSystemProvider: () => new NodeFileSystemProvider(),
      })
      const content = await manager.format({ file: fileUri })
      console.log(content)
      return {
        content
      }
    }, {
      runPerf: opts.dev_perf
    })

    if (opts.dev_perf) {
      const speed = perfRes.result.content.length / perfRes.elapsed_secs
      console.log(`[Perf] Finished format, elapsed=${perfRes.elapsed_ms} ms, speed=${speed} chars/s`)
    }

  }

  async parse(opts: { config: string; ir: boolean; checkParse: boolean } & GlobalOptions) {

    const perfRes = await RunPerf(async () => {
      const compileRes = await this.handleCompile({
        ...opts,
        check: {
          checkParse: opts.checkParse,
          checkSymbols: false
        }
      })

      if (!compileRes.ok) {
        const diagErr = compileRes.error
        this.printCompileError(diagErr)
        return
      }
      return compileRes.value
    }, { runPerf: opts.dev_perf })

    if (!perfRes.result) {
      return
    }

    const ast = perfRes.result.ast

    const yamlKeyBlockList = ['_nodeDescription', '_ref']
    console.log(yaml.dump(
      ast,
      {
        noRefs: false,
        replacer(key, value) {
          if (key.startsWith("$") && key !== '$type') {
            return undefined
          }
          if (yamlKeyBlockList.includes(key)) {
            return undefined
          }
          if (value instanceof RegExp) {
            return value.source
          }
          return value
        },
      }
    ))

    if (opts.dev_perf) {
      const content = await fs.readFile(perfRes.result?.fileName)

      const speed = content.length / perfRes.elapsed_secs
      console.log(`[Perf] Finished parse, elapsed=${perfRes.elapsed_ms} ms, speed=${speed} chars/s`)
    }

  }

  async codegen(opts: { file?: string; lang: string } & GlobalOptions) {

    const perfRes = await RunPerf(async () => {
      const irSpecRes = await this.handleCompile({ ...opts, config: opts.file || 'main.ft' })

      if (!irSpecRes.ok) {
        this.printCompileError(irSpecRes.error)
        return
      }

      const irSpec = irSpecRes.value.irSpec
      const app = await faas.resolveApplicationFromIr({ ir: irSpec })

      const generator = await getGeneratorPlugin(opts.lang)
      if (generator.generate) {
        const result = await generator.generate(
          { app, irSpec },
          this.getPluginRuntime(opts)
        )

        this.logger.info(`Write the code generation results to the code/gen/`)

        return result

      }
    }, {
      runPerf: opts.dev_perf
    })

    if (!perfRes.result) {
      return
    }

    if (opts.dev_perf) {

      const totalSize = perfRes.result.items.reduce((acc, item) => acc + item.content.length, 0)
      const speed = totalSize / perfRes.elapsed_secs
      console.log(`[Perf] Finished parse, elapsed=${perfRes.elapsed_ms} ms, speed=${speed} chars/s`)
    }

    await this.handleWriteGeneration({
      workingDir: opts.workingDir,
      generation: perfRes.result,
    })

  }

  private getPluginRuntime(opts: { workingDir: string }): faas.ProviderPluginContext {
    return {
      cwd: opts.workingDir,
      env: process.env,
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
    const compileResult = await this.handleCompile(opts)

    if (!compileResult.ok) {
      throw new AppError(`failed to compile, e`, { cause: compileResult.error })
    }
    return await faas.resolveApplicationFromIr({ ir: compileResult.value.irSpec })
  }

  async handleCompile(opts: {
    workingDir: string
    config: string
    check?: CheckOptions
  }): Promise<ft_utils.Result<{
    irSpec: ir.Spec,
    ast: parser.ast.Instance,
    fileName: string
  }, DiagnosticError>> {

    const checkOpts = opts.check || {
      checkParse: false,
      checkSymbols: false
    }
    const file = path.resolve(opts.workingDir, opts.config)
    const fileUri = URI.file(file)

    const manager = new parser.LspManager({
      fileSystemProvider: () => new NodeFileSystemProvider(),
    })

    const parseResult = await manager.parse({
      file: fileUri,
      check: checkOpts
    })

    if (!parseResult.ok) {
      return parseResult
    }

    const inst = parseResult.value

    // just print as ir currently
    const irSpec = await ir.convertFromAst({ mainInst: inst })

    if (checkOpts.checkSymbols) {
      const idSet = new Set()
      for (const symbol of irSpec.symbols) {
        if (idSet.has(symbol.id)) {
          throw Error(`conflict symbol: ${symbol.id}`)
        }
        idSet.add(symbol.id)
      }
    }

    ir.evaluateIR({ spec: irSpec })

    return {
      ok: true, value: {
        irSpec,
        ast: inst,
        fileName: file
      }
    }
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

  async handleGetProvider(opt: { app: faas.Application, provider?: string }) {
    let provider = opt.app.output.defaultProvider.value

    if (opt.provider) {
      const providerRef = opt.app.output.providers.find(v => v.value.$ir.name === opt.provider)
      if (!providerRef) {
        throw new Error(`no such provider=${opt.provider}`)
      }
      provider = providerRef.value
    }
    return provider
  }

  async handleGetInputValue(opts: { rt: faas.ProviderPluginContext, app: faas.Application, inputValue?: string, example: number }) {
    // use input examples as default
    let value = opts.app.output.inputExamples[opts.example]?.value
    if (opts.inputValue) {
      value = JSON.parse(opts.inputValue)
    } else {
      value = await this.transformInputValue(value)
    }

    // use input examples as default
    if (value == undefined) {
      opts.rt.logger.warn(`no input value provided, use '--input.value' to specify the input value in json format`)
    }
    return value
  }


  // hacky way to handle file loading
  async transformInputValue(value: unknown): Promise<unknown> {
    // handle special ir first
    if (ir.types.isBaseEirNode(value)) {
      if (ir.types.isTypeCallValue(value)) {
        if (value.$ir.callee.value.$ir.name === 'file') {
          // load file
          const file = value.args![0] as string

          const content = await fs.readFile(file, { encoding: 'base64' })
          const ext = path.extname(file)
          // to base64 with type
          return {
            path: file,
            ext,
            base64: content
          }
        }
      }

      return value
    }

    // recursively transform
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value
      }

      // record
      let obj: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        obj[key] = await this.transformInputValue(val)
      }
      return obj
    }

    return value
  }
}
