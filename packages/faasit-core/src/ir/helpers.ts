import { ast } from '../parser'
import { ir_types } from '.'

export async function convertFromAst(opts: {
  main: ast.Module
}): Promise<ir_types.Spec> {
  return new IrConverter(opts).convert()
}

class IrConverter {
  constructor(private ctx: { main: ast.Module }) {}

  convert(): ir_types.Spec {
    const { main } = this.ctx

    const irMain: ir_types.Module = {
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

    return { version: ir_types.CUR_VERSION, modules: [irMain] }
  }

  handleBlock(block: ast.Block): ir_types.Block | undefined {
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
        block_type: block.block_type,
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

    const blk: never = block
    throw new Error(`unknown block type=${(blk as any).$type}`)
  }

  handlePropList(props: ast.Property[]): ir_types.Property[] {
    return props.map((p) => {
      return { key: p.name, value: this.handleExpr(p.value) }
    })
  }

  handleExpr(expr: ast.Expr): ir_types.Value {
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
