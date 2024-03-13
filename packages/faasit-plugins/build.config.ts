import { defineBuildConfig, BuildEntry } from 'unbuild'

function ProviderEntry(name: string): BuildEntry {
  return {
    builder: 'rollup',
    input: `./src/providers/${name}/index.ts`,
    name
  }
}

function GeneratorEntry(name: string): BuildEntry {
  return {
    builder: 'rollup',
    input: `./src/generators/${name}/index.ts`,
    name
  }
}

export default defineBuildConfig([
  {
    entries: [
      'aliyun', 'aws', 'knative', 'local', 'local-once', 'openfaas', 'tencentyun'
    ].map(v => ProviderEntry(v)),
    rollup: {
      emitCJS: true,
      output: { exports: "named" }
    },
    outDir: './dist/providers',
    declaration: false,
  }, {
    entries: ['nodejs'].map(v => GeneratorEntry(v)),
    rollup: {
      emitCJS: true,
      output: { exports: "named" }
    },
    outDir: './dist/generators',
    declaration: false,
  },
])
