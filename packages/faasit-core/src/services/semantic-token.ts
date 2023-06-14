import {
  AbstractSemanticTokenProvider,
  AstNode,
  SemanticTokenAcceptor,
} from 'langium'
import { ast } from '../parser'

export class FaasitSemanticTokenProvider extends AbstractSemanticTokenProvider {
  protected highlightElement(
    node: AstNode,
    acceptor: SemanticTokenAcceptor
  ): void | 'prune' | undefined {
    if (ast.isBlock(node)) {
      if ('name' in node) {
        acceptor({
          node,
          property: 'name',
          type: 'class',
        })
      }

      if (ast.isCustomBlock(node)) {
        acceptor({
          node,
          property: 'for_target',
          type: 'class',
        })

        acceptor({
          node,
          property: 'block_type',
          type: 'function',
        })

        acceptor({
          node,
          keyword: '@',
          index: 0,
          type: 'decorator',
        })
      }
      return
    }

    if (ast.isProperty(node)) {
      acceptor({
        node,
        property: 'name',
        type: 'property',
      })
      return
    }

    if (ast.isQualifiedName(node)) {
      acceptor({
        node,
        property: 'names',
        type: 'variable',
      })
      return
    }
  }
}
