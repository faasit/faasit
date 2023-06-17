import { types } from '.'

export interface OutFile {
  path: string
  content: string
  // mime type, like application/json
  mime?: string
}

export interface GenerateOutput {
  outFiles: OutFile[]
}

// Plugin resolves ir as input
export interface LangPlugin {
  name: string

  generate?: (opts: { spec: types.Spec }) => Promise<GenerateOutput>
}
