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

async function handleInit(opts: {}) {}

export function main() {
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
    .option('-n, --name [string]', 'project name')
    .action(async (p) => {
      await handleInit(p).catch((e) => console.error(e))
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
    .command('compile')
    .argument('<file>', 'input file')
    .description('compile faast DSL')
    .action(async (p) => {
      await engine
        .compile({
          workingDir: process.cwd(),
          file: p,
        })
        .catch(handleError)
    })

  program
    .command('eval')
    .argument('<file>', 'input file')
    .description('eval values of faast DSL')
    .action(async (p) => {
      await engine
        .eval({
          workingDir: process.cwd(),
          file: p,
        })
        .catch(handleError)
    })

  program.parse(process.argv)
}
