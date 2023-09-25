import { types } from '.'
import { AppError, InternalError } from '../errors'
import { ast } from '../parser'

export async function convertFromAst(opts: {
  mainInst: ast.Instance
}): Promise<types.Spec> {
  return new AstToIrConverter(opts).convert()
}

const BuiltinTypes = new Map(['string', 'float', 'bool', 'int', 'any', 'type'].map(v => [v, {
  $ir: {
    kind: 't_atomic',
    type: v
  }
}])) as Map<string, types.Value>

/**
 * Convert an ast.Instance to Raw IR
 */
class AstToIrConverter {
  constructor(private ctx: { mainInst: ast.Instance }) { }

  convert(): types.Spec {
    const { mainInst } = this.ctx

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
      const irBlock = this.handleBlock(block)
      if (irBlock) {
        mainPackage.blocks.push(irBlock)
      }
    }

    return { version: types.CUR_VERSION, packages: [mainPackage], libs: [mainLib], symbols: [] }
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
      return {
        $ir: {
          kind: 'b_custom',
          // todo: use symbol
          block_type: block.block_type.names.join('.'),
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
      return { key: p.name, value: this.handleExpr(p.value) }
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
      // TODO: unify identifier

      // builtin types
      const name = expr.names.join('.')

      const builtinType = BuiltinTypes.get(name)
      if (builtinType) {
        return builtinType
      }

      return types.CreateUnresolvedReference(name)
    }

    if (expr.$type === 'TypeCallExpr') {
      throw new Error('not implemented for TypeCallExpr')
    }

    const v: never = expr
    throw new Error(`unknown expr: ${v}`)
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
  private symtab: Map<string, types.BaseEirNode> = new Map()
  constructor(private ctx: { spec: types.Spec }) {
    // construct symtab
    const pkg = ctx.spec.packages[0]

    for (const block of pkg.blocks) {
      this.symtab.set(block.$ir.name, block)
    }

    // TODO: add symbols
  }

  evaluate(): void {
    const pkg = this.ctx.spec.packages[0]

    for (const blk of pkg.blocks) {
      if (types.isCustomBlock(blk)) {
        this.evaluateBlock(blk)
      }
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
      // modify inplace (since $ir may have a reference to the ref object)
      Object.defineProperty(value, 'value', { value: this.symtab.get(value.$ir.id) })
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

    if (value.$ir.kind === 'v_empty') {
      return null
    }

    if (value.$ir.kind === 't_atomic') {
      return value
    }

    const chk: never = value.$ir
    throw new InternalError(`unknown value kind=${JSON.stringify(chk)}`)
  }
};

export function evaluateIR(opts: { spec: types.Spec }) {
  const evalutor = new IrEvaluator(opts)
  return evalutor.evaluate()
}