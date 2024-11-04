import { defineBuildConfig, BuildEntry } from 'unbuild'

export default defineBuildConfig([
  {
    entries: [{
      builder: 'rollup',
      input: './src/index.ts',
    }],
    rollup: {
      emitCJS: true,
    },
    outDir: './dist',
    declaration: false,
  }
])
