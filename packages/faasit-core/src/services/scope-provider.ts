import { AstNode, AstNodeDescription, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, LangiumDocument, LangiumServices, MapScope, ReferenceInfo, Scope, Stream, StreamScope, findRootNode, getDocument, stream } from "langium";
import { ast } from "../parser";
import * as builtins from '../builtins'
import { inferTypeOnce } from "./type-system/infer";


export class FaasitScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumServices) {
    super(services)
  }

  override getScope(context: ReferenceInfo): Scope {
    // Compute reference from the use of reference
    // Currently only have one type of container that has Reference
    if (ast.isQualifiedName(context.container)) {
      const qname = context.container as ast.QualifiedName
      const prev = qname.previous

      // resolve like `a`
      if (!prev) {
        const refType = this.getReferenceTypeFromQname(qname, qname.$container)
        return this.getChainedScope(refType, context)
      }

      // resolve like `a.b.c`
      const prevType = inferTypeOnce(prev)
      if (prevType.kind === 't_package') {
        return this.scopePackageSymbols(prevType.node)
      }

      // no package resolved
      // TODO: support block-like, alias type
      return EMPTY_SCOPE
    }

    return super.getScope(context)
  }

  // only builtins
  protected getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {
    const factory = () => {
      const elements = this.indexManager.allElements(referenceType, new Set([builtins.DocumentUri.toString()]))
      return new MapScope(elements)
    }

    return this.globalScopeCache.get(referenceType, factory);
  }

  private scopePackageSymbols(packageItem: ast.SemaPackage): Scope {
    return this.createScopeForNodes(packageItem.symbols)
  }

  private getReferenceTypeFromQname(qname: AstNode, container: AstNode): string {
    if (ast.isCustomBlock(container)) {
      const property = qname.$containerProperty
      if (property == 'block_type') {
        return ast.BlockBlock
      }

      if (property == 'for_target') {
        return ast.CustomBlock
      }

      throw new Error(`unknown property in CustomBlock`)
    }

    return ast.NamedElement
  }

  // similar to default.getScope, but with customized referenceType filter
  private getChainedScope(referenceType: string, context: ReferenceInfo): Scope {
    const scopes: Array<Stream<AstNodeDescription>> = [];

    const precomputed = getDocument(context.container).precomputedScopes;
    if (precomputed) {
      let currentNode: AstNode | undefined = context.container;
      do {
        const allDescriptions = precomputed.get(currentNode);
        if (allDescriptions.length > 0) {
          scopes.push(stream(allDescriptions).filter(
            desc => this.reflection.isSubtype(desc.type, referenceType)));
        }
        currentNode = currentNode.$container;
      } while (currentNode);
    }

    let result: Scope = this.getGlobalScope(referenceType, context);
    for (let i = scopes.length - 1; i >= 0; i--) {
      result = this.createScope(scopes[i], result);
    }
    return result;
  }
}