import { z } from 'zod'

export type BaseEirNode = {
  $ir: { kind: string }
}

export type AtomicValue =
  | {
    $ir: {
      kind: 'v_string'
      value: string
    }
  }
  | { $ir: { kind: 'v_int'; value: number }; }
  | { $ir: { kind: 'v_bool'; value: boolean }; }
  | { $ir: { kind: 'v_float'; value: number }; }
  | { $ir: { kind: 'v_any'; value: any } }

export type ObjectValue = {
  $ir: {
    kind: 'v_object'
    props: {
      key: string
      value: Value
    }[]
  }
}

// types
export const BuiltinScalarIds = ['string', 'bool', 'int', 'float', 'any', 'never', 'null', 'empty'] as const
export type ScalarBlock = { $ir: { kind: 'b_scalar', id: string; name: string } }

export function isBuiltinScalarId(id: string): id is typeof BuiltinScalarIds[0] {
  return BuiltinScalarIds.includes(id as typeof BuiltinScalarIds[0])
}

// values

export type Value =
  | AtomicValue
  | { $ir: { kind: 'v_list'; items: Value[] } }
  | ObjectValue
  | Reference<unknown>

export type EvaluatedValue = number | boolean | string | Reference | EvaluatedValue[] | { [key: string]: EvaluatedValue }

export const CUR_VERSION = '0.1.0'

export type Reference<T = unknown> = {
  $ir: {
    kind: "r_ref"
    id: string
  }
  value: T
}

export function CreateUnresolvedReference<T>(id: string): Reference<T> {
  return {
    $ir: {
      kind: 'r_ref',
      id,
    },
    get value(): never {
      throw new Error(`Reference not resolved, id: ${id}`)
    }
  }
}

export type Spec = {
  version: string
  packages: Package[]
  libs: Library[]
  symbols: Symbol[]
}

export type Library = {
  kind: 'p_lib'
  id: string
}

export type Package = {
  kind: 'p_entry'
  id: string
  lib: Reference<Library>
  blocks: Block[]
}

export type Symbol = {
  kind: 's_ref'
  id: string
} | {
  kind: 's_inline'
  id: string
  value: BaseEirNode
}

export type Property = { key: string; value: Value }

export type CustomBlock<O = unknown> = {
  $ir: {
    kind: 'b_custom'
    block_type: Reference<BlockBlock>
    name: string
    props: Property[]
  }

  output: O
}

export type StructBlock = {
  $ir: {
    kind: 'b_struct'
    name: string
    props: Property[]
  }
}

export type BlockBlock = {
  $ir: {
    kind: 'b_block'
    name: string
    props: Property[]
  }
}

export type Block = CustomBlock | BlockBlock | StructBlock | ScalarBlock

// types
export function isAtomicValue(v: BaseEirNode): v is AtomicValue {
  if (v.$ir.kind.startsWith('v_') && 'value' in v.$ir) {
    return true
  }
  return false
}

export function isCustomBlock(v: BaseEirNode): v is CustomBlock {
  return v.$ir.kind === 'b_custom'
}

export function isBaseEirNode(v: unknown): v is BaseEirNode {
  if (typeof v !== 'object' || v == null) {
    return false
  }

  return '$ir' in v
}

export function isReference(v: unknown): v is Reference {
  if (isBaseEirNode(v)) {
    return v.$ir.kind === 'r_ref'
  }

  return false
}

export function isAtomicType(v: unknown): v is ScalarBlock {
  if (isBaseEirNode(v)) {
    return v.$ir.kind === 't_atomic'
  }

  return false
}

export function validateSpec(o: unknown): Spec {
  return SpecSchema.parse(o)
}

export function validatePackage(o: unknown): Package {
  return PackageSchema.parse(o)
}

export function validateBlock(o: unknown): Block {
  return BlockSchema.parse(o)
}

export function ReferenceSchemaT<T>(schema: z.ZodType<T>): z.ZodType<Reference<T>> {
  return z.object({
    $ir: z.object({
      kind: z.literal('r_ref'),
      id: z.string()
    }),
    value: z.optional(schema)
  }) as z.ZodType<Reference<T>>
}

export const ObjectValueSchema: z.ZodType<ObjectValue> = z.object({
  $ir: z.object({
    kind: z.literal('v_object'),
    props: z.array(
      z.object({
        key: z.string(),
        value: z.lazy(() => ValueSchema),
      })
    ),
  })
})

// we should declare type first to use recursive schema
export const ValueSchema: z.ZodType<Value> = z.union([
  z.object({
    $ir: z.object({
      kind: z.literal('v_int'),
      value: z.number(),
    })
  }),
  z.object({
    $ir: z.object({
      kind: z.literal('v_bool'),
      value: z.boolean(),
    })
  }),
  z.object({
    $ir: z.object({
      kind: z.literal('v_string'),
      value: z.string(),
    })
  }),
  z.object({
    $ir: z.object({
      kind: z.literal('v_list'),
      items: z.array(z.lazy(() => ValueSchema)),
    })
  }),
  ObjectValueSchema,
  ReferenceSchemaT(z.unknown())
])

export const StructLikeTypeSchema: z.ZodType<{ [key: string]: Value }> = z.record(z.string(), ValueSchema);

export const BlockBlockSchema: z.ZodType<BlockBlock> = z.object({
  $ir: z.object({
    kind: z.literal('b_block'),
    name: z.string(),
    props: z.array(
      z.object({
        key: z.string(),
        value: ValueSchema,
      })
    ),
  }),
})

export function CustomBlockSchemaT<T>(schema: z.ZodType<T>): z.ZodType<CustomBlock<T>> {
  return z.object({
    $ir: z.object({
      kind: z.literal('b_custom'),
      block_type: ReferenceSchemaT(BlockBlockSchema),
      name: z.string(),
      props: z.array(
        z.object({
          key: z.string(),
          value: ValueSchema,
        })
      ),
    }),
    output: schema
  }) as z.ZodType<CustomBlock<T>>
}


export const BlockSchema: z.ZodType<Block> = z.union([
  CustomBlockSchemaT(z.unknown()),
  z.object({
    $ir: z.object({
      kind: z.literal('b_struct'),
      name: z.string(),
      props: z.array(
        z.object({
          key: z.string(),
          value: ValueSchema,
        })
      ),
    }),
  }),
  z.object({
    $ir: z.object({
      kind: z.literal('b_block'),
      name: z.string(),
      props: z.array(
        z.object({
          key: z.string(),
          value: ValueSchema,
        })
      ),
    }),
  }),
])

export const LibrarySchema: z.ZodType<Library> = z.object({
  kind: z.literal('p_lib'),
  id: z.string()
})

export const SymbolSchema: z.ZodType<Symbol> = z.union([z.object({
  kind: z.literal('s_ref'),
  id: z.string(),
}), z.object({
  kind: z.literal('s_inline'),
  id: z.string(),
  value: z.object({
    '$ir': z.object({
      kind: z.string()
    })
  })
})])

const PackageSchema: z.ZodType<Package> = z.object({
  kind: z.literal('p_entry'),
  id: z.string(),
  lib: ReferenceSchemaT(LibrarySchema),
  blocks: z.array(BlockSchema),
})

const SpecSchema: z.ZodType<Spec> = z.object({
  version: z.string(),
  packages: z.array(PackageSchema),
  libs: z.array(LibrarySchema),
  symbols: z.array(SymbolSchema)
})
