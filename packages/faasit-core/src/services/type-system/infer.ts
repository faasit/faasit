import { AstNode } from "langium";
import * as desc from "./description";
import { ast } from "../../parser";

export function inferTypeOnce(node: AstNode | undefined): desc.SemaType {
  return new CachedTypeSystem().inferType(node)
}

export class CachedTypeSystem {
  private cache: Map<AstNode, desc.SemaType> = new Map()
  constructor() { }

  inferType(node: AstNode | undefined): desc.SemaType {
    if (!node) {
      return desc.createSemaError('Could not infer type for undefined')
    }

    const existing = this.cache.get(node)
    if (existing) {
      return existing
    }

    // pervent recursive inference errors
    this.cache.set(node, desc.createSemaError('Recursive definition', node))
    let type = this.inferTypeNode(node)
    if (!type) {
      type = desc.createSemaError(`Could not infer type for ${node.$type}`, node)
    }

    this.cache.set(node, type);
    return type
  }

  private inferTypeNode(node: AstNode): desc.SemaType | undefined {
    if (ast.isLiteral(node)) {
      return desc.createLiteralType(node)
    }
    if (ast.isStructBlock(node) || ast.isBlockBlock(node)) {
      return { kind: 't_object', node }
    }
    if (ast.isQualifiedName(node)) {
      return this.inferQualifiedName(node)
    }
    if (ast.isSemaPackage(node)) {
      return { kind: 't_package', node }
    }

    return undefined
  }

  private inferQualifiedName(node: ast.QualifiedName) {
    // nested qualified name will be resolved by scope provider

    // element resolved
    const element = node.element.ref
    if (element) {
      return this.inferType(element)
    }

    return desc.createSemaError(`could not infer type for element: ${node.element.$refText}`, node)
  }
}
