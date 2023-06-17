import { createFaasitServices } from '../services'
import type { URI } from 'vscode-uri'
import { ast } from '.'
import { FileSystemProvider } from '../runtime'
import { Result } from '../utils'
import { DiagnosticError } from '../errors'

export type ParseResult<T> = Result<T, DiagnosticError>

export async function parse(opts: {
  file: URI
  fileSystemProvider: () => FileSystemProvider
}): Promise<Result<ast.Module, DiagnosticError>> {
  const services = createFaasitServices({
    fileSystemProvider: opts.fileSystemProvider,
  })

  const document =
    services.shared.workspace.LangiumDocuments.getOrCreateDocument(opts.file)
  await services.shared.workspace.DocumentBuilder.build([document], {
    validationChecks: 'all',
  })
  const errors = (document.diagnostics ?? []).filter((e) => e.severity === 1)

  if (errors.length == 0) {
    return {
      ok: true,
      value: document.parseResult.value as ast.Module,
    }
  }

  return {
    ok: false,
    error: new DiagnosticError(errors, document.textDocument),
  }
}
