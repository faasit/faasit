import { Command, Option } from 'commander'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'node:path'
import { Engine } from './engine'

export function resolveConfigPath(config?: string) {
  if (config) {
    return config
  }

  const configPath = path.resolve(process.cwd(), 'main.ft')
  if (fs.existsSync(configPath)) {
    return configPath
  }

  return path.resolve(process.cwd(), 'main.yaml')
}

export interface SharedOptions {
  flags: string,
  description?: string,
  default?: string | boolean | number | null,
}

function createSharedOptions<T extends Record<string, SharedOptions>>(options: T): {
  [K in keyof T]: Option
} {
  const entries = Object.entries(options).map(([k, v]) => {
    const opt = new Option(v.flags, v.description).default(v.default)
    return [k, opt]
  })

  return Object.fromEntries(entries)
}

export async function main() {
  const program = new Command('faasit')

  program.showHelpAfterError().showSuggestionAfterError()

  program.description('DSL toolchain for Serverless')

  // load environment
  dotenv.config({
    path: path.join(process.cwd(), '.env')
  })

  const engine = new Engine()

  // console.debug(`working dir = ${process.cwd()}`)

  const handleError = (e: unknown) => {
    console.error(e)
  }

  const shared = createSharedOptions({
    devPerf: {
      flags: '--dev_perf',
      description: 'enable perf mode for development',
    }
  })

  program
    .command('init')
    .requiredOption('-n, --name [string]', 'project name')
    .requiredOption('-t, --template [string]', 'template name')
    .option('--lang [string]', 'language name', 'javascript')
    .action(async (p) => {
      await engine.init({
        ...p,
        workingDir: process.cwd(),
      }).catch(handleError)
    })

  program
    .command('deploy')
    .description('deploy serverless application')
    .option('-p, --provider [string]', 'deploy on given provider')
    .action(async (p) => {
      const config = resolveConfigPath('')
      await engine
        .deploy({
          config,
          workingDir: process.cwd(),
          ...p,
        })
        .catch(handleError)
    })

  program
    .command('run')
    .description('run serverless application once')
    .option('--input.value [string]', 'input value in JSON format')
    .option('--example [int]', 'select specified example', '0')
    .action(async (p) => {
      const config = resolveConfigPath('')
      await engine
        .run({
          config,
          workingDir: process.cwd(),
          ...p,
        })
        .catch(handleError)
    })

  program
    .command('invoke')
    .description('invoke serverless function')
    .option('-f, --func [string]', 'function name')
    .option('-p, --provider [string]', 'deploy on given provider')
    .option('--example [int]', 'select example data', '0')
    .action(async (p) => {
      const config = resolveConfigPath('')
      await engine
        .invoke({ config, workingDir: process.cwd(), ...p })
        .catch(handleError)
    })

  program
    .command('parse')
    .argument('[file]', 'input file')
    .option("--no-stdout", "disable printing into stdout")
    .option('--no-check-parse', 'not validate faasit DSL')
    .addOption(shared.devPerf)
    .description('evaluate value and ir of faast DSL')
    .action(async (file, opts) => {
      const config = resolveConfigPath(file)
      await engine
        .parse({
          workingDir: process.cwd(),
          config,
          ...opts,
        })
        .catch(handleError)
    })

  program
    .command('fmt')
    .argument('[file]', 'input file')
    .option('-p, --print', 'print into stdout')
    .description('format faast DSL')
    .addOption(shared.devPerf)
    .action(async (file, opts) => {
      const config = resolveConfigPath(file)
      await engine
        .format({
          workingDir: process.cwd(),
          config,
          ...opts,
        })
        .catch(handleError)
    })

  program.command('convert').argument('[file]', 'input file').description('convert ir to ft code')
    .action(async (file, opts) => {
      const config = resolveConfigPath(file)
      await engine
        .convert({
          workingDir: process.cwd(),
          config,
          ...opts,
        })
        .catch(handleError)
    })

  program.command('dev-view').argument('[file]', 'input file').description('display info for DSL')
    .option('--symbol-table')
    .action(async (file, opts) => {
      const config = resolveConfigPath(file)
      await engine
        .devView({
          workingDir: process.cwd(),
          config,
          ...opts,
        })
        .catch(handleError)
    })

  program
    .command('eval')
    .argument('[file]', 'input file')
    .option('--ir', 'print $ir for semantic object')
    .option('-o, --output <outputFile>', 'output file')
    .option('--no-check-parse', 'not validate faasit DSL')
    .option('--check-symbols', 'validate symbols for faasit DSL')
    .option('--no-lazy', 'no lazy evaluation for reference')
    .description('evaluate value and ir of faast DSL')
    .action(async (file, opts) => {
      const config = resolveConfigPath(file)
      await engine
        .eval({
          workingDir: process.cwd(),
          config,
          ...opts,
        })
        .catch(handleError)
    })

  program
    .command('codegen')
    .option('--lang <lang>', 'language to generate', 'nodejs')
    .addOption(shared.devPerf)
    .argument('[file]', '')
    .action(async (file, opts) => {
      await engine.codegen({
        workingDir: process.cwd(),
        file,
        ...opts,
      })
    })

  await program.parseAsync(process.argv)
}
