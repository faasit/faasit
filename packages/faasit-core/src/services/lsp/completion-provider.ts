import { CompletionAcceptor, CompletionContext, CompletionProviderOptions, DefaultCompletionProvider, MaybePromise, NextFeature, getContainerOfType } from "langium";
import { CompletionItemKind, Range } from "vscode-languageserver-types";
import { ast } from "../../parser";

export class FaasitCompletionProvider extends DefaultCompletionProvider {
  readonly completionOptions: CompletionProviderOptions = {
    triggerCharacters: ['"', '.', '@']
  }

  protected completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): MaybePromise<void> {
    if (ast.isImportClause(context.node) && next.property === 'url') {
      return this.completeImportPath(context, acceptor)
    }
    return super.completionFor(context, next, acceptor)
  }

  private completeImportPath(context: CompletionContext, acceptor: CompletionAcceptor) {
    let allPaths = ["std/faas"];

    // copy from langium-grammar/lsp
    const text = context.textDocument.getText();
    const existingText = text.substring(context.tokenEndOffset, context.offset);
    let range: Range = {
      start: context.position,
      end: context.position
    };
    if (existingText.length > 0) {
      const existingPath = existingText.substring(1);
      allPaths = allPaths.filter(path => path.startsWith(existingPath));
      // Completely replace the current token
      const start = context.textDocument.positionAt(context.tokenOffset + 1);
      const end = context.textDocument.positionAt(context.tokenEndOffset - 1);
      range = {
        start,
        end
      };
    }
    for (const path of allPaths) {
      // Only insert quotes if there is no `path` token yet.
      const delimiter = existingText.length > 0 ? '' : '"';
      const completionValue = `${delimiter}${path}${delimiter}`;
      acceptor(context, {
        label: path,
        textEdit: {
          newText: completionValue,
          range
        },
        kind: CompletionItemKind.File,
        sortText: '0'
      });
    }
  }
}