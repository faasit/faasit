import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/extension',
    {
      input: './src/language-server/',
      outDir: './out/language-server',
      builder: 'mkdist',
      format: 'cjs',
    },
  ],
  clean: true,
  rollup: {
    emitCJS: true,
    cjsBridge: true,
  },
  declaration: true,
  outDir: './out',
  externals: ['vscode'],
})
