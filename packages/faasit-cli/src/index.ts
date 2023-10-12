import { Command } from 'commander'
import path from 'node:path'
import fs from 'fs'
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

async function handleInit(opts: {}) { }

export async function main() {
  const program = new Command('faasit')

  program.showHelpAfterError().showSuggestionAfterError()

  program.description('DSL toolchain for Serverless')

  const engine = new Engine()

  // console.debug(`working dir = ${process.cwd()}`)

  const handleError = (e: unknown) => {
    console.error(e)
  }

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
    .action(async (p) => {
      const config = resolveConfigPath('')
      await engine
        .deploy({
          config,
          workingDir: process.cwd(),
        })
        .catch(handleError)
    })

  program
    .command('invoke')
    .description('invoke serverless function')
    .option('-f, --func [string]', 'function name')
    .action(async (p) => {
      const config = resolveConfigPath('')
      await engine
        .invoke({ config, workingDir: process.cwd(), func: p.func })
        .catch(handleError)
    })

  program
    .command('eval')
    .argument('[file]', 'input file')
    .option('--no-ir', 'not print $ir for semantic object')
    .option('--no-check', 'not validate faasit DSL')
    .option('--no-lazy', 'no lazy evaluation for reference')
    .description('evaluate value and ir of faast DSL')
    .action(async (file, opts) => {
      await engine
        .eval({
          workingDir: process.cwd(),
          file: file,
          ...opts,
        })
        .catch(handleError)
    })

  program
    .command('codegen')
    .option('--lang <lang>', 'language to generate', 'js')
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
