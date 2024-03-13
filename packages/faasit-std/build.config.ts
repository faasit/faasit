import { defineBuildConfig, BuildEntry } from 'unbuild'

function LibEntry(name: string): BuildEntry {
  return {
    builder: 'rollup',
    input: `./src/${name}/index.ts`,
    name
  }
}

export default defineBuildConfig(
  {
    entries: [
      LibEntry('faas'),
      LibEntry('rest'),
    ],
    externals: ['@faasit/core'],
    rollup: {
      emitCJS: true,
    },
    outDir: './dist',
    // TODO: enable declaration when fixed
    declaration: false,
  })