import { Command } from 'commander'
import * as esbuild from 'esbuild'

const isProduction = process.env.NODE_ENV === 'production'

/** @type {esbuild.BuildOptions} */
const sharedConfig = {
  bundle: true,
  minify: isProduction,
  sourcemap: !isProduction,
  target: ['es6'],
  external: ['vscode'],
  logLevel: 'info',
  treeShaking: true,

  // https://esbuild.github.io/api/#conditions to support workspace deps
  conditions: ['faasit:bundler'],
}

/** @type {esbuild.BuildOptions} */
const browserExtensionBuildConfig = {
  ...sharedConfig,
  entryPoints: [
    {
      in: './src/extension.browser.ts',
      out: 'extension.browser',
    },
  ],
  // we should use cjs in the browser extension, otherwise the extension won't work
  format: 'cjs',
  platform: 'browser',
  outdir: './out',
}

/** @type {esbuild.BuildOptions} */
const browserServerBuildConfig = {
  ...sharedConfig,
  entryPoints: [
    {
      in: './src/language-server/server.browser.ts',
      out: 'language-server/server.browser',
    },
  ],
  // we should use iife because server will run in webworker
  format: 'iife',
  platform: 'browser',
  outdir: './out',
}

/** @type {esbuild.BuildOptions} */
const nodeBuildConfig = {
  ...sharedConfig,
  entryPoints: [
    {
      in: './src/extension.node.ts',
      out: 'extension.node',
    },
    {
      in: './src/language-server/server.node.ts',
      out: 'language-server/server.node',
    },
  ],
  platform: 'node',
  outdir: './out',
}

async function main() {
  const program = new Command('builder')

  program.command('build').action(async () => {
    const t1 = esbuild.build(browserExtensionBuildConfig)
    const t2 = esbuild.build(browserServerBuildConfig)
    const t3 = esbuild.build(nodeBuildConfig)
    await Promise.all([t1, t2, t3])
  })

  program
    .command('watch')
    .option(
      '-m, --module <module>',
      'build module, choice: ["all", "browser", "node"]',
      'all'
    )
    .action(async (opts) => {
      /** t */
      const module = opts.module.split(',')
      const context = []

      if (module.includes('all') || module.includes('browser')) {
        const ctx1 = await esbuild.context(browserExtensionBuildConfig)
        const ctx2 = await esbuild.context(browserServerBuildConfig)
        context.push(ctx1, ctx2)
      }

      if (module.includes('all') || module.includes('node')) {
        const ctx = await esbuild.context({
          ...nodeBuildConfig,
        })
        context.push(ctx)
      }

      await Promise.race(context.map((c) => c.watch()))
    })

  program.parse(process.argv)
}

main().catch((e) => console.error(e))
