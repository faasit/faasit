import { faas } from '@faasit/std'
import { ir, ft_utils } from '@faasit/core'

export {}

interface EventOutput {
  name: string
  type: string
  data: {
    [key: string]: {
      id: string
    }
  }
}

export function JavascriptGeneratorPlugin(): faas.GeneratorPlugin {
  return {
    name: 'javascript',
    async generate(input, ctx) {
      const { irSpec } = input
      const irService = ir.makeIrService(irSpec)

      const events = irSpec.modules[0].blocks
        .filter((b) => b.kind === 'b_custom' && b.block_type === 'event')
        .map((b) =>
          irService.convertToValue(b as ir.types.CustomBlock)
        ) as EventOutput[]

      // generate `events.d.ts`
      const generateEventDts = (): faas.GenerationItem => {
        const printer = new ft_utils.StringPrinter()

        printer.println(`export declare var CloudEventTypes: {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.name}: '${event.type}'`)
        }
        printer.dedent()
        printer.println('}')

        printer.println('')

        // print event types
        for (const event of events) {
          printer.println(`export interface ${event.name} {`)
          printer.indent()
          for (const [key, value] of Object.entries(event.data)) {
            printer.println(`${key}: ${value.id}`)
          }
          printer.dedent()
          printer.println('}')
        }

        return {
          path: './code/gen/events.d.ts',
          content: printer.toString(),
          contentType: 'text/typescript',
        }
      }

      const generateEventJs = (): faas.GenerationItem => {
        const printer = new ft_utils.StringPrinter()

        printer.println(`export const CloudEventTypes = {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.name}: '${event.type}'`)
        }
        printer.dedent()
        printer.println(`}`)

        return {
          path: './code/gen/events.js',
          content: printer.toString(),
          contentType: 'text/javascript',
        }
      }

      return {
        items: [generateEventDts(), generateEventJs()],
      }
    },
  }
}
