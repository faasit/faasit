import { InternalError } from '../errors'
import { ast } from '../gen'

export interface CodeGenerator {
  name: string
  generate(ctx: CodeGenreateContext): Promise<CodeGenerateOutput>
}

export interface OutFile {
  path: string
  content: string
  // mime type, like application/json
  mime?: string
}

export interface CodeGenreateContext {
  mainModule: ast.Module
}

export interface CodeGenerateOutput {
  files: OutFile[]
}

export class CodeGenerateOutputCollector {
  private _currentFile: OutFile | undefined
  private files: OutFile[] = []
  constructor() {}

  static create() {
    return new CodeGenerateOutputCollector()
  }

  addFile(opts: { path: string; mime?: string }) {
    this._currentFile = { ...opts, content: '' }
    this.files.push(this._currentFile)
  }

  currentFile() {
    if (!this._currentFile) {
      throw new InternalError('No current file defined')
    }
    return this._currentFile
  }

  print(content: string) {
    this.currentFile().content += content
  }

  finalize(): CodeGenerateOutput {
    return {
      files: this.files,
    }
  }
}
