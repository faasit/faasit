import { expandToNode as toNode } from 'langium'
import {
  GenerationContext,
  GenerationOutput,
  GenerationOutputCollector,
} from './common'
import { ast } from '../gen'

class IRGenerator {
  private collector = new GenerationOutputCollector()
  constructor(private ctx: GenerationContext) {}

  generate(): GenerationOutput {
    const { main } = this.ctx

    let content = ''
    for (const block of main.blocks) {
      content += this.generateBlock(block) + '\n'
    }

    this.collector.addFile('main.yml', content)

    return this.collector.toOutput()
  }

  generateBlock(block: ast.Block): string {
    return ''
  }
}
