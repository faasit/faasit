import z, { string } from 'zod';



const HttpTriggerConfigSchema = z.object({
  authType : z.enum(["anonymous","function"]).default("anonymous"),
  methods : z.array(z.enum(["HEAD","GET","POST","PUT","DELETE","PATCH","OPTIONS"])),
  disableURLInternet: z.boolean().default(false),
  authConfig: z.string().optional()
});

const TimeTriggerConfigSchema = z.object({
  payload: z.string().optional(),
  cronExpression: z.union([
    z.string().regex(/^@every \d+[hm]$/),
    z.string().regex(/^(\*|[0-5]?\d)\s+(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|0?[1-9]|1[0-2])\s+(\*|[0-7])$/
    )]),
  enable: z.boolean().default(true)
});

const BaseTriggerSchema = z.object({
  triggerName: z.string(),
  description: z.string().optional(),
  triggerConfig: z.object({})
})


const HttpTriggerSchema = BaseTriggerSchema.merge(z.object({
  triggerConfig: HttpTriggerConfigSchema
}));

const TimeTriggerSchema = BaseTriggerSchema.merge(z.object({
  triggerConfig : TimeTriggerConfigSchema,
}))

export type BaseTrigger = z.infer<typeof BaseTriggerSchema>

export type HttpTrigger = z.infer<typeof HttpTriggerSchema>

export type TimeTrigger = z.infer<typeof TimeTriggerSchema>

function getHttpTrigger(
  name:string,
  description: string,
  triggerConfig: {
    authType: string| undefined,
    methods: string[],
    disableURLInternet: boolean | undefined,
    authConfig: string| undefined
  }
): HttpTrigger {
  const trigger = HttpTriggerSchema.safeParse({
    triggerName: name,
    description: description,
    triggerConfig: triggerConfig
  });
  if (trigger.success) {
    return trigger.data;
  } else {
    throw new Error(trigger.error.toString());
  }
}

function getTimerTrigger(
  name: string,
  description: string,
  triggerConfig: {
    payload: string | undefined,
    cronExpression: string,
    enable: boolean | undefined
  }
) : TimeTrigger {
  const trigger = TimeTriggerSchema.safeParse({
    triggerName: name,
    description: description,
    triggerConfig: triggerConfig
  });
  if (trigger.success) {
    return trigger.data;
  } else {
    throw new Error(trigger.error.toString());
  }
}

export async function getTrigger(input:{
  kind:string,
  name:string,
  opts: {[key:string]:any}
}): Promise<BaseTrigger> {
  const triggers = {
    http: (name:string,opts:{[key:string]:any}) => getHttpTrigger(
      name,
      opts.description, 
      {
        authType          : opts.authType,
        methods           : opts.methods ? opts.methods: ["GET","PUT","DELETE","POST"],
        disableURLInternet: opts.disableURLInternet,
        authConfig        : opts.authConfig
      }
    ),
    timer: (name:string,opts:{[key:string]:any}) => getTimerTrigger(
      name,
      opts.description,
      {
        payload       : opts.payload,
        cronExpression: opts.cronExpression ? opts.cronExpression: "@every 1h",
        enable        : opts.enable
      }
    )
  } as const

  const isTriggerName = (name:string): name is keyof typeof triggers => {
    return name in triggers;
  }
  
  if (isTriggerName(input.kind)) {
    return triggers[input.kind](input.name,input.opts);
  }

  throw new Error(`${input.kind} Trigger doesn't support now.`)
}