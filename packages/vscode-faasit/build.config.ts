import { defineBuildConfig } from 'unbuild'

// Stub won't work in vscode, it can't find 'vscode' module
export default defineBuildConfig({
  entries: [
    './src/extension',
    {
      input: './src/language-server/main',
      name: 'server-node',
    },
    {
      input: './src/language-server/main-browser',
      name: 'server-browser',
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
