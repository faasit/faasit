import {
  CodeGenreateContext,
  CodeGenerateOutput,
  CodeGenerateOutputCollector,
  CodeGenerator,
} from './common'
import { ast } from '../gen'
import * as ir from '../ir'
import yaml from 'js-yaml'

class IRGeneratorImpl {
  constructor(private ctx: CodeGenreateContext) {}

  generate(): CodeGenerateOutput {
    const { mainModule } = this.ctx

    const irModule: ir.Module = {
      kind: 'm_inline',
      id: '__main__',
      blocks: [],
    }

    for (const block of mainModule.blocks) {
      irModule.blocks.push(this.handleBlock(block))
    }

    const collector = CodeGenerateOutputCollector.create()
    collector.addFile({ path: 'main.yml', mime: 'text/plain' })
    collector.print(yaml.dump(irModule))
    return collector.finalize()
  }

  handleBlock(block: ast.Block): ir.Block {
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
        block_type: block.block_type.$refText,
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

    const blk: never = block
    throw new Error(`unknown block type ${blk}`)
  }

  handlePropList(props: ast.Property[]): ir.Property[] {
    return props.map((p) => {
      return { key: p.name, value: this.handleExpr(p.value) }
    })
  }

  handleExpr(expr: ast.Expr): ir.Value {
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

export function IRGenerator(): CodeGenerator {
  return {
    name: 'ir-gen',
    async generate(ctx) {
      const generator = new IRGeneratorImpl(ctx)
      return generator.generate()
    },
  }
}
