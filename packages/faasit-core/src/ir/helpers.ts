import { types } from '.'
import { AppError, InternalError } from '../errors'
import { ast } from '../parser'

export async function convertFromAst(opts: {
  main: ast.Module
}): Promise<types.Spec> {
  return new AstToIrConverter(opts).convert()
}

class AstToIrConverter {
  constructor(private ctx: { main: ast.Module }) { }

  convert(): types.Spec {
    const { main } = this.ctx

    const irMain: types.Module = {
      kind: 'm_inline',
      id: '__main__',
      blocks: [],
    }

    for (const block of main.blocks) {
      const irBlock = this.handleBlock(block)
      if (irBlock) {
        irMain.blocks.push(irBlock)
      }
    }

    return { version: types.CUR_VERSION, modules: [irMain] }
  }

  handleBlock(block: ast.Block): types.Block | undefined {
    if (block.$type === 'BlockBlock') {
      return {
        kind: 'b_block',
        name: block.name,
        props: this.handlePropList(block.props),
      }
    }

    if (block.$type === 'CustomBlock') {
      return {
        kind: 'b_custom',
        // todo: use symbol
        block_type: block.block_type.names.join('.'),
        name: block.name || '',
        props: this.handlePropList(block.props),
      }
    }

    if (block.$type === 'StructBlock') {
      return {
        kind: 'b_struct',
        name: block.name,
        props: this.handlePropList(block.props),
      }
    }

    if (block.$type === 'UseBlock') {
      return undefined
    }

    if (block.$type === 'ServiceBlock') {
      return {
        kind: 'b_service',
        name: block.name,
        parent: block.for_target?.$refText,
        methods: this.handleRpcList(block.methods),
      }
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

  handleRpcList(rpcs: ast.RpcDecl[] | undefined): types.Method[] {
    if (rpcs === undefined) {
      return []
    }
    return rpcs.map((rpc) => {
      return {
        name: rpc.name,
        arg: this.handlePara(rpc.arg_type),
        ret: this.handlePara(rpc.return_type),
      }
    })
  }

  handlePara(para: ast.StreamedType | undefined): types.Parameter {
    if (para === undefined) {
      return { stream: false, type: { kind: 'v_empty' } }
    }
    return {
      stream: para.streamed === undefined ? false : true,
      type: { kind: 'v_ref', id: para.type },
    }
  }

  handleExpr(expr: ast.Expr): types.Value {
    if (expr.$type === 'LiteralString') {
      return { kind: 'v_string', value: expr.value }
    }

    if (expr.$type === 'LiteralInt') {
      return { kind: 'v_int', value: expr.value }
    }

    if (expr.$type === 'LiteralFloat') {
      return { kind: 'v_float', value: expr.value }
    }

    if (expr.$type === 'LiteralBool') {
      return { kind: 'v_bool', value: expr.value }
    }

    if (expr.$type === 'BlockExpr') {
      return { kind: 'v_object', props: this.handlePropList(expr.props) }
    }

    if (expr.$type === 'ListExpr') {
      return {
        kind: 'v_list',
        items: expr.items.map((i) => this.handleExpr(i)),
      }
    }

    if (expr.$type === 'QualifiedName') {
      // TODO: resolve symbol
      return { kind: 'v_ref', id: expr.names.join('.') }
    }

    if (expr.$type === 'TypeCallExpr') {
      throw new Error('not implemented for TypeCallExpr')
    }

    const v: never = expr
    throw new Error(`unknown expr: ${v}`)
  }
}

export function makeIrService(spec: types.Spec) {
  return new IrService({ spec })
}

export class IrService {
  /**
   * IrService maintains symtab resolves from Ir Spec
   * and provides useful methods to handle with ir
   */
  private symtab: Map<string, types.BaseNode> = new Map()
  private module: types.Module
  constructor(private ctx: { spec: types.Spec }) {
    // construct symtab
    this.module = ctx.spec.modules[0]

    for (const block of this.module.blocks) {
      this.symtab.set(block.name, block)
    }
  }

  getMainModule() {
    return this.module
  }

  convertToValue(value: types.Value | types.CustomBlock): unknown {
    // atomic value
    if (types.isAtomicValue(value)) {
      return value.value
    }

    if (value.kind === 'v_ref') {
      const block = this.symtab.get(value.id)
      if (!block) {
        return {
          '$kind': value.kind,
          '$id': value.id
        }
      }

      if (types.isCustomBlock(block)) {
        return {
          '$id': value.id,
          ...(this.convertToValue(block) as object)
        }
      }

      return block
    }

    if (value.kind === 'v_list') {
      return value.items.map((i) => this.convertToValue(i))
    }

    if (value.kind === 'v_object') {
      let obj: Record<string, unknown> = {}
      for (const prop of value.props) {
        obj[prop.key] = this.convertToValue(prop.value)
      }
      return obj
    }

    if (value.kind === 'b_custom') {
      // TODO: use b_block to typecheck
      let obj: Record<string, unknown> = {}
      if (value.name) {
        obj['name'] = value.name
      }
      for (const prop of value.props) {
        obj[prop.key] = this.convertToValue(prop.value)
      }
      return obj
    }

    if (value.kind === 'v_empty') {
      return null
    }

    const chk: never = value
    throw new InternalError(`unknown value kind=${JSON.stringify(chk)}`)
  }
}
