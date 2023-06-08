import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/extension',
    {
      input: './src/language-server/main',
      name: 'server-node'
    },
    {
      input: './src/language-server/main-browser',
      name: 'server-browser'
    },
  ],
  clean: true,
  rollup: {
    emitCJS: true,
    cjsBridge: true,
    inlineDependencies: true, 
  },
  declaration: true,
  outDir: './out',
  externals: ['vscode'],
})
