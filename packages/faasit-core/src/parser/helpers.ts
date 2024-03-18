import type { AstNode, LangiumDocument } from 'langium'
import { TextEdit } from 'vscode-languageserver-types'
import type { URI } from 'vscode-uri'
import { ast } from '.'
import { builtins, ft_utils } from '..'
import { CheckOptions } from '../common'
import { DiagnosticError } from '../errors'
import { FileSystemProvider } from '../runtime'
import { createFaasitServices } from '../services'
import { Result } from '../utils'

export type ParseResult<T> = Result<T, DiagnosticError>

export class LspManager {
  private services: ReturnType<typeof createFaasitServices>
  private builtinDoc: LangiumDocument<AstNode>

  constructor(opts: {
    fileSystemProvider: () => FileSystemProvider
  }) {
    this.services = createFaasitServices({
      fileSystemProvider: opts.fileSystemProvider,
    })

    this.builtinDoc = this.services.shared.workspace.LangiumDocumentFactory.fromString(builtins.FileCore, builtins.DocumentUri)
    this.services.shared.workspace.LangiumDocuments.addDocument(this.builtinDoc);
  }

  async format(opts: { file: URI }) {
    const document = this.services.shared.workspace.LangiumDocuments.getOrCreateDocument(opts.file)

    const edits = await this.services.faasit.lsp.Formatter?.formatDocument(document, { options: { insertSpaces: true, tabSize: 2 }, textDocument: document.textDocument })

    return this.applyEdits(document, edits || [])
  }

  async parse(opts: {
    file: URI
    check: CheckOptions
  }): Promise<ft_utils.Result<ast.Instance, DiagnosticError>> {

    const { checkParse = false } = opts.check

    const document =
      this.services.shared.workspace.LangiumDocuments.getOrCreateDocument(opts.file)
    await this.services.shared.workspace.DocumentBuilder.build([this.builtinDoc, document], {
      validation: checkParse,
    })
    const errors = (document.diagnostics ?? []).filter((e) => e.severity === 1)

    if (errors.length == 0) {
      return {
        ok: true,
        value: document.parseResult.value as ast.Instance,
      }
    }

    return {
      ok: false,
      error: new DiagnosticError(errors, document.textDocument),
    }
  }

  private applyEdits(document: LangiumDocument<AstNode>, edits: TextEdit[]): string {
    const textDocument = document.textDocument
    let formattedContent = textDocument.getText();

    edits.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);

    let offset = 0;
    for (const edit of edits) {
      const start = textDocument.offsetAt(edit.range.start);
      const end = textDocument.offsetAt(edit.range.end);
      formattedContent = formattedContent.slice(0, start + offset) + edit.newText + formattedContent.slice(end + offset);
      offset += edit.newText.length - (end - start);
    }

    return formattedContent;
  }
}
