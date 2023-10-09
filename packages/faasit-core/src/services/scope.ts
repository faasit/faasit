import { DefaultScopeProvider, EMPTY_SCOPE, LangiumServices, ReferenceInfo, Scope, StreamScope } from "langium";
import { ast } from "../parser";
import { inferTypeOnce } from "./type-system/infer";


export class FaasitScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumServices) {
    super(services)
  }

  override getScope(context: ReferenceInfo): Scope {
    if (context.property === 'element') {
      const qname = context.container as ast.QualifiedName
      const prev = qname.previous
      if (!prev) {
        return super.getScope(context)
      }

      const prevType = inferTypeOnce(prev)
      if (prevType.kind === 't_package') {
        return this.scopePackageSymbols(prevType.node)
      }

      return EMPTY_SCOPE
    }

    return super.getScope(context)
  }

  // protected override getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {
  //   return this.createScopeForNodes([])

  // }

  private scopePackageSymbols(packageItem: ast.SemaPackage): Scope {
    return this.createScopeForNodes(packageItem.symbols)
  }

}