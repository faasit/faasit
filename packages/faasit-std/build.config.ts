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
    rollup: {
      emitCJS: true,
    },
    outDir: './dist',
    declaration: true,
  })