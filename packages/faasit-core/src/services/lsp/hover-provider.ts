import { AstNode, AstNodeHoverProvider } from "langium";
import { Hover } from "vscode-languageserver-types";
import { ast } from "../../parser";
import { inferTypeOnce } from "../type-system/infer";
import * as desc from '../type-system/description'

export class FaasitHoverProvider extends AstNodeHoverProvider {
  protected getAstNodeHoverContent(node: AstNode): Hover | undefined {
    if (ast.isQualifiedName(node)) {
      const type = inferTypeOnce(node)
      if (type.kind === 'error') {
        return {
          contents: {
            kind: 'markdown', language: 'faasit', value: `failed to infer type, err=${type.message}`
          }
        }
      }

      return {
        contents: {
          kind: 'markdown',
          language: 'faasit',
          value: `${node.element.$refText}: ${desc.typeToString(type)}`
        }
      }
    }

    return undefined;
  }
}
