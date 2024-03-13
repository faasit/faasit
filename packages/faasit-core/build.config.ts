import { defineBuildConfig, BuildEntry } from 'unbuild'

function ProviderEntry(name: string): BuildEntry {
  return {
    builder: 'rollup',
    input: `./src/providers/${name}/index.ts`,
    name
  }
}

export default defineBuildConfig([
  {
    entries: [
      {
        builder: 'rollup',
        input: './src/index.ts',
        name: 'index'
      }
    ],
    rollup: {
      emitCJS: true,
      output: { exports: "named" }
    },
    outDir: './dist',
    declaration: true,
  }
])
