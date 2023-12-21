import z, { string } from 'zod';
import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406'
import * as $Util from '@alicloud/tea-util'

const HttpTriggerConfigSchema = z.object({
  authType: z.enum(["anonymous", "function"]).default("anonymous"),
  methods: z.array(z.enum(["HEAD", "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])),
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
  type: z.string(),
  triggerName: z.string(),
  description: z.string().optional(),
  triggerConfig: z.object({})
})


const HttpTriggerSchema = BaseTriggerSchema.merge(z.object({
  triggerConfig: HttpTriggerConfigSchema
}));

const TimeTriggerSchema = BaseTriggerSchema.merge(z.object({
  triggerConfig: TimeTriggerConfigSchema,
}))

export type BaseTrigger = z.infer<typeof BaseTriggerSchema>

export type HttpTrigger = z.infer<typeof HttpTriggerSchema>

export type TimeTrigger = z.infer<typeof TimeTriggerSchema>

function getHttpTrigger(
  name: string,
  description: string,
  triggerConfig: {
    authType: string | undefined,
    methods: string[],
    disableURLInternet: boolean | undefined,
    authConfig: string | undefined
  }
): HttpTrigger {
  const trigger = HttpTriggerSchema.safeParse({
    type: 'http',
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
): TimeTrigger {
  const trigger = TimeTriggerSchema.safeParse({
    type: "timer",
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

export function getTrigger(input: {
  kind: string,
  name: string,
  opts: { [key: string]: any }
}): BaseTrigger {
  const triggers = {
    http: (name: string, opts: { [key: string]: any }) => getHttpTrigger(
      name,
      opts.description,
      {
        authType: opts.authType,
        methods: opts.methods ? opts.methods : ["GET", "PUT", "DELETE", "POST"],
        disableURLInternet: opts.disableURLInternet,
        authConfig: opts.authConfig
      }
    ),
    timer: (name: string, opts: { [key: string]: any }) => getTimerTrigger(
      name,
      opts.description,
      {
        payload: opts.payload,
        cronExpression: opts.cronExpression ? opts.cronExpression : "@every 1h",
        enable: opts.enable
      }
    )
  } as const

  const isTriggerName = (name: string): name is keyof typeof triggers => {
    return name in triggers;
  }

  if (isTriggerName(input.kind)) {
    return triggers[input.kind](input.name, input.opts);
  }

  throw new Error(`${input.kind} Trigger doesn't support now.`)
}

export class AliyunTrigger {
  baseTrigger: BaseTrigger
  constructor(private opt: {
    client: FC_Open20210406,
    serviceName: string,
    functionName: string,
    triggerName: string,
    triggerType: string,
    triggerOpts: { [key: string]: any }
  }) {
    this.baseTrigger = getTrigger({
      kind: opt.triggerType,
      name: opt.triggerName,
      opts: {}
    })
  }

  async create(): Promise<$FC_Open20210406.CreateTriggerResponse | undefined> {
    let headers = new $FC_Open20210406.CreateTriggerHeaders({});
    let requests = new $FC_Open20210406.CreateTriggerRequest({
      triggerName: this.baseTrigger.triggerName,
      triggerType: this.baseTrigger.type,
      triggerConfig: JSON.stringify(this.baseTrigger.triggerConfig)
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.createTriggerWithOptions(
        this.opt.serviceName,
        this.opt.functionName,
        requests,
        headers,
        runtime
      );
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async update(): Promise<$FC_Open20210406.UpdateTriggerResponse | undefined> {
    let headers = new $FC_Open20210406.UpdateTriggerHeaders({});
    let requests = new $FC_Open20210406.UpdateTriggerRequest({
      triggerName: this.baseTrigger.triggerName,
      triggerType: this.baseTrigger.type,
      triggerConfig: JSON.stringify(this.baseTrigger.triggerConfig)
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.updateTriggerWithOptions(
        this.opt.serviceName,
        this.opt.functionName,
        this.baseTrigger.triggerName,
        requests,
        headers,
        runtime
      );
      return resp;
    } catch (err) {
      throw err;
    }
  }

  async get(): Promise<$FC_Open20210406.GetTriggerResponse | undefined> {
    let headers = new $FC_Open20210406.GetTriggerHeaders({});
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.getTriggerWithOptions(
        this.opt.serviceName,
        this.opt.functionName,
        this.baseTrigger.triggerName,
        headers,
        runtime
      );
      return resp;
    } catch (error) {
      if (error.code != 'TriggerNotFound') {
        throw error;
      }
    }
  }
}