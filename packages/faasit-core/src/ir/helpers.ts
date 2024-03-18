import { AstNode } from 'langium'
import { InternalError } from '../errors'
import { ast } from '../parser'
import * as types from './types'

export async function convertFromAst(opts: {
  mainInst: ast.Instance
}): Promise<types.Spec> {
  return new AstToIrConverter(opts).convert()
}

/**
 * Convert an ast.Instance to Raw IR
 */
class AstToIrConverter {
  symbolCache: Map<AstNode, unknown> = new Map()

  constructor(private ctx: { mainInst: ast.Instance }) { }

  convert(): types.Spec {
    const { mainInst } = this.ctx

    const symbols: types.Symbol[] = []

    const mainLib: types.Library = {
      kind: 'p_lib',
      id: '__main__'
    }

    const mainPackage: types.Package = {
      kind: 'p_entry',
      id: '__main__',
      blocks: [],
      lib: {
        $ir: {
          kind: 'r_ref',
          id: '__main__'
        },
        value: mainLib
      }
    }

    for (const block of mainInst.blocks) {
      let irBlock = this.symbolCache.get(block) as types.Block | undefined
      if (!irBlock) {
        irBlock = this.handleBlock(block)
        if (irBlock) {
          this.symbolCache.set(block, irBlock)
          const id = irBlock.$ir.name
          symbols.push({
            kind: 's_internal',
            id: irBlock.$ir.name,
            ref: {
              $ir: {
                kind: "r_ref",
                id
              },
              value: irBlock
            }
          })
        }
      }

      if (irBlock) {
        mainPackage.blocks.push(irBlock)
      }
    }

    return { version: types.CUR_VERSION, packages: [mainPackage], libs: [mainLib], symbols }
  }

  handleNamedElement(node: ast.NamedElement): unknown {
    if (ast.isBlock(node)) {
      return this.handleBlock(node)
    }

    if (ast.isExpr(node)) {
      return this.handleExpr(node)
    }

    if (node.$type === 'SemaPackage') {
      throw new Error(`not supported`)
    }

    const chk: never = node
    throw new Error(`unknown node type=${(node as any).$type}`)
  }

  handleBlock(block: ast.Block): types.Block | undefined {
    if (block.$type === 'BlockBlock') {
      return {
        $ir: {
          kind: 'b_block',
          name: block.name,
          props: this.handlePropList(block.props),
        }
      }
    }

    if (block.$type === 'CustomBlock') {
      const block_type_id = this.getIdOfQualifedName(block.block_type)
      // const block_type = types.CreateUnresolvedReference<types.BlockBlock>(block_type_id)
      const block_type: types.Reference = {
        $ir: { kind: 'r_ref', id: block_type_id },
        value: undefined
      }

      return {
        $ir: {
          kind: 'b_custom',
          // todo: use symbol
          block_type: block_type as types.Reference<types.BlockBlock>,
          name: block.name || '',
          props: this.handlePropList(block.props),
        },
        get output() {
          throw new Error(`CustomBlock not evaluated, name=${block.name}`)
        }
      }
    }

    if (block.$type === 'StructBlock') {
      return {
        $ir: {
          kind: 'b_struct',
          name: block.name,
          props: this.handlePropList(block.props),
        }
      }
    }

    if (block.$type === 'ScalarBlock') {
      return {
        $ir: {
          kind: 'b_scalar',
          id: block.name,
          name: block.name
        }
      }
    }

    if (block.$type === 'ShapeBlock') {
      return undefined
    }

    if (block.$type === 'UseBlock') {
      return undefined
    }

    if (block.$type == 'LibBlock') {
      return undefined
    }

    const blk: never = block
    throw new Error(`unknown block type=${(blk as any).$type}`)
  }

  handlePropList(props: ast.Property[]): types.Property[] {
    return props.map((p) => {
      return { key: p.key, value: this.handleExpr(p.value) }
    })
  }

  handleExpr(expr: ast.Expr): types.Value {
    if (expr.$type === 'LiteralString') {
      return { $ir: { kind: 'v_string', value: expr.value } }
    }

    if (expr.$type === 'LiteralInt') {
      return { $ir: { kind: 'v_int', value: expr.value } }
    }

    if (expr.$type === 'LiteralFloat') {
      return { $ir: { kind: 'v_float', value: expr.value } }
    }

    if (expr.$type === 'LiteralBool') {
      return { $ir: { kind: 'v_bool', value: expr.value } }
    }

    if (expr.$type === 'BlockExpr') {
      return { $ir: { kind: 'v_object', props: this.handlePropList(expr.props) } }
    }

    if (expr.$type === 'ListExpr') {
      return {
        $ir: {
          kind: 'v_list',
          items: expr.items.map((i) => this.handleExpr(i)),
        }
      }
    }

    if (expr.$type === 'QualifiedName') {
      return this.handleQualifiedName(expr)
    }

    if (expr.$type === 'TypeCallExpr') {
      return {
        $ir: {
          kind: 'v_typecall',
          callee: this.handleQualifiedName(expr.callee) as types.Reference<types.ScalarBlock>,
          args: expr.elements.map((e) => this.handleExpr(e))
        }
      }
    }

    const v: never = expr
    throw new Error(`unknown expr: ${v}`)
  }

  private handleQualifiedName(expr: ast.QualifiedName): types.Reference {
    // TODO: unify identifier
    const id = this.getIdOfQualifedName(expr)
    const refElement = expr.element.ref

    if (!refElement) {
      return types.CreateUnresolvedReference(id)
    }

    let value = this.symbolCache.get(refElement)
    if (!value) {
      value = this.handleNamedElement(refElement)
      this.symbolCache.set(refElement, value)
    }

    return {
      $ir: {
        kind: 'r_ref',
        id
      },
      value
    }
  }

  private getIdOfQualifedName(node: ast.QualifiedName): string {
    const names = []
    let p: ast.QualifiedName | undefined = node
    while (p) {
      names.push(p.element.$refText)
      p = p.previous
    }

    names.reverse()
    return names.join('.')
  }
}

/**
 * Evaluate from Raw IR to Evaluated IR
 */
class IrEvaluator {
  /**
 * IrService maintains symtab resolves from Ir Spec
 * and provides useful methods to handle with ir
 */
  constructor(private ctx: { spec: types.Spec }) {
    // construct symtab
    // const pkg = ctx.spec.packages[0]

    // for (const block of pkg.blocks) {
    //   this.symtab.set(block.$ir.name, block)
    // }

    // TODO: add symbols
  }

  evaluate(): void {
    const pkg = this.ctx.spec.packages[0]

    for (const blk of pkg.blocks) {
      if (types.isCustomBlock(blk)) {
        this.evaluateBlock(blk)
      }
      // console.log(`evaluate blk`, blk)
    }
  }

  private evaluateBlock(blk: types.CustomBlock): void {
    // TODO: use block_type to typecheck
    let obj: Record<string, unknown> = {}
    for (const prop of blk.$ir.props) {
      obj[prop.key] = this.evaluateValue(prop.value)
    }

    Object.defineProperty(blk, 'output', { value: obj })
  }

  private evaluateValue(value: types.Value): unknown {
    // atomic value
    if (types.isAtomicValue(value)) {
      return value.$ir.value
    }

    if (value.$ir.kind === 'r_ref') {
      return value
    }

    if (value.$ir.kind === 'v_list') {
      return value.$ir.items.map((i) => this.evaluateValue(i))
    }

    if (value.$ir.kind === 'v_object') {
      let obj: Record<string, unknown> = {}
      for (const prop of value.$ir.props) {
        obj[prop.key] = this.evaluateValue(prop.value)
      }
      return obj
    }

    if (value.$ir.kind === 'v_typecall') {
      let args = []
      for (const arg of value.$ir.args) {
        args.push(this.evaluateValue(arg))
      }
      return {
        ...value,
        args
      }
    }

    const chk: never = value.$ir
    throw new InternalError(`unknown value kind=${JSON.stringify(chk)}`)
  }
};

export function evaluateIR(opts: { spec: types.Spec }) {
  const evalutor = new IrEvaluator(opts)
  return evalutor.evaluate()
}