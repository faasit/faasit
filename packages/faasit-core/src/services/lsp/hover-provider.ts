import { AstNode, AstNodeHoverProvider } from "langium";
import { Hover } from "vscode-languageserver-types";
import { ast } from "../../parser";

export class FaasitHoverProvider extends AstNodeHoverProvider {
  protected getAstNodeHoverContent(node: AstNode): Hover | undefined {

    if (ast.isStructBlock(node)) {
      return {
        contents: {
          kind: 'markdown',
          language: 'faasit',
          value: `struct ${node.name} {}`
        }
      }
    }

    if (ast.isCustomBlock(node)) {
      const block_type = node.block_type.element.$refText
      return {
        contents: {
          kind: 'markdown',
          language: 'faasit',
          value: `@${block_type} ${node.name} {}`
        }
      }
    }

    if (ast.isBlockBlock(node)) {
      return {
        contents: {
          kind: 'markdown',
          language: 'faasit',
          value: `block ${node.name} {}`
        }
      }
    }

    if (ast.isScalarBlock(node)) {
      return {
        contents: {
          kind: 'markdown',
          language: 'faasit',
          value: `scalar ${node.name} {}`
        }
      }
    }

    return undefined;
  }
}
