import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/index',
  ],
  clean: true,
  rollup: {
    emitCJS: true,
    cjsBridge: true,
  },
  declaration: true,
  outDir: './dist',
})
