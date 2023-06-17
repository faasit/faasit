import { LangiumDocument } from 'langium'
import { Diagnostic } from 'vscode-languageserver-types'

export class AppError extends Error {
  constructor(message?: string, private opts?: { cause?: Error }) {
    super(message)
  }
}

export class InternalError extends Error {}

export class DiagnosticError extends AppError {
  constructor(
    public diags: Diagnostic[],
    public textDocument: LangiumDocument['textDocument']
  ) {
    const errorMsgs = diags.map(
      (error) =>
        `line ${error.range.start.line}: ${
          error.message
        } [${textDocument.getText(error.range)}]`
    )
    super(errorMsgs.join(', '))
  }
}
