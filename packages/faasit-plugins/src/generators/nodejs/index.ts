import { faas } from '@faasit/std'
import { ir, ft_utils } from '@faasit/core'
import { object } from 'zod'

export { }

interface EventOutput {
  name: string
  type: string
  data: {
    [key: string]: {
      $id: string
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

        const printType = (typ: object) => {
          if (Array.isArray(typ)) {
            printType(typ[0])
            printer.printRaw('[]')
            return
          }

          if ('$id' in typ) {
            printer.printRaw(typ.$id as string)
            return
          }

          printer.printRaw('{').printNewline()
          printer.indent()
          for (const [key, value] of Object.entries(typ)) {
            printer.printIndent().printRaw(`${key}: `)
            printType(value)
            printer.printNewline()
          }
          printer.dedent();
          printer.printIndent().printRaw('}')
        }

        printer.println(`export declare var CloudEventTypes: {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.name}: '${event.type}'`)
        }
        printer.dedent()
        printer.println('}').printNewline()

        printer.println(`export declare var CloudEventCreators: {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.name}: (d: ${event.name}) => ${event.name}`)
        }
        printer.dedent()
        printer.println('}').printNewline()

        // print event types
        for (const event of events) {
          printer.println(`export interface ${event.name} {`)
          printer.indent()
          for (const [key, value] of Object.entries(event.data)) {
            printer.printIndent()
            printer.printRaw(`${key}: `)
            printType(value)
            printer.printNewline()
          }
          printer.dedent()
          printer.println('}').printNewline()
        }

        return {
          path: './code/gen/events.d.ts',
          content: printer.toString(),
          contentType: 'text/typescript',
        }
      }

      const generateEventJs = (): faas.GenerationItem => {
        const printer = new ft_utils.StringPrinter()

        printer.println(`const CloudEventTypes = {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.name}: '${event.type}',`)
        }
        printer.dedent()
        printer.println(`}`).printNewline();

        printer.println('const CloudEventCreators = Object.fromEntries(')
        printer.println('  Object.keys(CloudEventTypes).map((k) => [k, (d) => d])')
        printer.println(');').printNewline();

        printer.println(`module.exports = { CloudEventTypes, CloudEventCreators }`)

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
