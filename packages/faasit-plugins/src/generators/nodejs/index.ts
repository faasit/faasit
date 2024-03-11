import { faas } from '@faasit/std'
import { ir, ft_utils } from '@faasit/core'

export { }

export default function JavascriptGeneratorPlugin(): faas.GeneratorPlugin {
  return {
    name: 'javascript',
    async generate(input, ctx) {
      const { irSpec } = input

      const events = irSpec.packages[0].blocks
        .filter((b) => b.$ir.kind === 'b_custom' && b.$ir.block_type.$ir.id === 'event') as faas.Event[]

      // generate `events.d.ts`
      const generateEventDts = (): faas.GenerationItem => {
        const printer = new ft_utils.StringPrinter()

        const printType = (typ: ir.Types.Value) => {

          if (typeof typ === 'string') {
            throw new Error(`failed to print type, got string, typ=${typ}`)
          }

          if (Array.isArray(typ)) {
            printType(typ[0])
            printer.printRaw('[]')
            return
          }

          if (ir.types.isReference(typ)) {
            printer.printRaw(typ.$ir.id)
            return
          }

          printer.printRaw('{').printNewline()
          printer.indent()
          for (const [key, value] of Object.entries(typ)) {
            if (key === '$ir') {
              continue
            }
            printer.printIndent().printRaw(`${key}: `)
            console.log(`key=${key}, value=${value}, typ=${typ}, typeof=${typeof typ}`)
            printType(value)
            printer.printNewline()
          }
          printer.dedent();
          printer.printIndent().printRaw('}')
        }

        printer.println(`export declare var CloudEventTypes: {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.$ir.name}: '${event.output.type}'`)
        }
        printer.dedent()
        printer.println('}').printNewline()

        printer.println(`export declare var CloudEventCreators: {`)
        printer.indent()
        for (const event of events) {
          printer.println(`${event.$ir.name}: (d: ${event.$ir.name}) => ${event.$ir.name}`)
        }
        printer.dedent()
        printer.println('}').printNewline()

        // print event types
        for (const event of events) {
          printer.println(`export interface ${event.$ir.name} {`)
          printer.indent()
          for (const [key, value] of Object.entries(event.output.data)) {
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
          printer.println(`${event.$ir.name}: '${event.output.type}',`)
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
