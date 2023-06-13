import { createFaasitServices } from '../services'
import type { URI } from 'vscode-uri'
import { ast } from '.'
import { Diagnostic } from 'vscode-languageserver-types'
import { FileSystemProvider } from '../runtime'
import { LangiumDocument } from 'langium'

export type ParseResult = {
  errors: Diagnostic[]
  parsedValue: ast.Module
  textDocument: LangiumDocument['textDocument']
}

export async function parse(opts: {
  file: URI
  fileSystemProvider: () => FileSystemProvider
}): Promise<ParseResult> {
  const services = createFaasitServices({
    fileSystemProvider: opts.fileSystemProvider,
  })

  const document =
    services.shared.workspace.LangiumDocuments.getOrCreateDocument(opts.file)
  await services.shared.workspace.DocumentBuilder.build([document], {
    validationChecks: 'all',
  })
  const errors = (document.diagnostics ?? []).filter((e) => e.severity === 1)

  return {
    errors,
    parsedValue: document.parseResult.value as ast.Module,
    textDocument: document.textDocument,
  }
}
