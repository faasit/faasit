import { defineBuildConfig, BuildEntry } from 'unbuild'

export default defineBuildConfig([
  {
    entries: [
      {
        builder: 'rollup',
        input: './src/index.ts',
        name: 'index',
      }
    ],
    rollup: {
      emitCJS: true,
      output: { exports: "named" },
      inlineDependencies: true,
      commonjs: {
        // without this, build fail
        extensions: ['.mjs', '.cjs', '.js', '.jsx', '.json'],
      },
    },

    outDir: './dist',
    declaration: true,
  }
])
