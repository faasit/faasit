import { z } from 'zod'

export type BaseNode = { kind: string }

export type AtomicValue =
  | {
    kind: 'v_string'
    value: string
  }
  | { kind: 'v_int'; value: number }
  | { kind: 'v_bool'; value: boolean }
  | { kind: 'v_float'; value: number }
  | { kind: 'v_any'; value: unknown }

export type Value =
  | AtomicValue
  | { kind: 'v_list'; items: Value[] }
  | {
    kind: 'v_object'
    props: {
      key: string
      value: Value
    }[]
  }
  | {
    kind: 'v_ref'
    id: string
  }
  | {
    kind: 'v_empty'
  }

export function isAtomicValue(v: { kind: string }): v is AtomicValue {
  if (v.kind.startsWith('v_') && 'value' in v) {
    return true
  }
  return false
}

export const CUR_VERSION = '0.1.0'

export type Spec = {
  version: string
  modules: Module[]
}

export type Module = {
  kind: 'm_inline'
  id: string
  blocks: Block[]
}

export type Property = { key: string; value: Value }

export type CustomBlock = {
  kind: 'b_custom'
  block_type: string
  name: string
  props: Property[]
}

// arg & ret
export type Parameter = {
  stream: boolean
  type: Value
}

export type Method = {
  name: string
  arg: Parameter
  ret: Parameter
}

export type ServiceBlock = {
  kind: 'b_service'
  name: string
  parent?: string
  methods: Method[]
}

export function isCustomBlock(v: BaseNode): v is CustomBlock {
  return v.kind === 'b_custom'
}

export type Block =
  | CustomBlock
  | ServiceBlock
  | { kind: 'b_struct'; name: string; props: Property[] }
  | { kind: 'b_block'; name: string; props: Property[] }

export function validateSpec(o: unknown): Spec {
  return SpecSchema.parse(o)
}

export function validateModule(o: unknown): Module {
  return ModuleSchema.parse(o)
}

export function validateBlock(o: unknown): Block {
  return BlockSchema.parse(o)
}

// we should declare type first to use recursive schema
export const ValueSchema: z.ZodType<Value> = z.union([
  z.object({
    kind: z.literal('v_int'),
    value: z.number(),
  }),
  z.object({
    kind: z.literal('v_bool'),
    value: z.boolean(),
  }),
  z.object({
    kind: z.literal('v_string'),
    value: z.string(),
  }),
  z.object({
    kind: z.literal('v_list'),
    items: z.array(z.lazy(() => ValueSchema)),
  }),
  z.object({
    kind: z.literal('v_object'),
    props: z.array(
      z.object({
        key: z.string(),
        value: z.lazy(() => ValueSchema),
      })
    ),
  }),
  z.object({
    kind: z.literal('v_ref'),
    id: z.string(),
  }),
])

const BlockSchema: z.ZodType<Block> = z.union([
  z.object({
    kind: z.literal('b_custom'),
    block_type: z.string(),
    name: z.string(),
    props: z.array(
      z.object({
        key: z.string(),
        value: ValueSchema,
      })
    ),
  }),
  z.object({
    kind: z.literal('b_struct'),
    name: z.string(),
    props: z.array(
      z.object({
        key: z.string(),
        value: ValueSchema,
      })
    ),
  }),
  z.object({
    kind: z.literal('b_block'),
    name: z.string(),
    props: z.array(
      z.object({
        key: z.string(),
        value: ValueSchema,
      })
    ),
  }),
  z.object({
    kind: z.literal('b_service'),
    name: z.string(),
    parent: z.string(),
    methods: z.array(
      z.object({
        name: z.string(),
        arg: z.object({
          stream: z.boolean(),
          type: ValueSchema,
        }),
        ret: z.object({
          stream: z.boolean(),
          type: ValueSchema,
        })
      })
    ),
  }),
])

const ModuleSchema: z.ZodType<Module> = z.object({
  kind: z.literal('m_inline'),
  id: z.string(),
  blocks: z.array(BlockSchema),
})

const SpecSchema: z.ZodType<Spec> = z.object({
  version: z.string(),
  modules: z.array(ModuleSchema),
})
