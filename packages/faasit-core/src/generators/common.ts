import { ast } from '../gen'

export interface OutFile {
  path: string
  content: string
}

export interface GenerationContext {
  main: ast.Module
}

export interface GenerationOutput {
  files: OutFile[]
}

export class GenerationOutputCollector {
  private files: OutFile[] = []
  constructor() {}

  addFile(path: string, content: string) {
    this.files.push({ path, content })
  }

  toOutput(): GenerationOutput {
    return {
      files: this.files,
    }
  }
}
