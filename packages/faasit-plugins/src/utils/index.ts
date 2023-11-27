import * as path from 'node:path'
import * as fs from 'fs-extra'
import ignore from 'ignore'

export async function mkdir(path: string) {
  await fs.mkdir(path)
  return path
}

export async function syncFile(from: string, to: string, opts: {
  ignore?: string[]
}) {
  await fs.mkdir(to)
  await fs.copy(from, to, {
    filter: ignore().add(opts.ignore || []).createFilter()
  })
}
