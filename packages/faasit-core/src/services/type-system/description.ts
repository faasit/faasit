import { AstNode } from "langium"
import { ast } from "../../parser"

export type SemaType = SemaMetaType | SemaScalarType | SemaObjectLikeType | SemaPackageType | SemaLiteralType | SemaError

export type SemaMetaType = {
  kind: "t_meta"
  def: unknown
}

export type SemaScalarType = {
  kind: "t_scalar"
  node: ast.ScalarBlock
}

export type SemaObjectLikeType = {
  kind: "t_object",
  node: ast.StructBlock | ast.BlockBlock
}

export type SemaLiteralType = {
  kind: "t_literal",
  node: ast.Expr
}

export type SemaPackageType = {
  kind: "t_package"
  node: ast.SemaPackage
}

export type SemaError = {
  kind: "error"
  node?: AstNode
  message: string
}

export function createLiteralType(node: ast.Expr): SemaLiteralType {
  return {
    kind: 't_literal',
    node
  }
}

export function createSemaError(message: string, node?: AstNode): SemaError {
  return {
    kind: 'error',
    node,
    message
  }
}

export function typeToString(typ: SemaType): string {
  if (typ.kind === 't_meta') {
    return 'type'
  }

  if (typ.kind === 't_scalar') {
    return typ.node.name
  }

  return typ.kind
}