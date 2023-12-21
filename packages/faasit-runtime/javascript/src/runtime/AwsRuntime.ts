import { BaseFaasitRuntime, CallParams, CallResult, FaasitRuntimeMetadata, InputType } from "./FaasitRuntime";

export class AwsRuntime extends BaseFaasitRuntime {
  name: string = "aws";

  constructor(private opt: { event: unknown, metadata: FaasitRuntimeMetadata }) {
    super()
  }

  metadata(): FaasitRuntimeMetadata {
    return this.opt.metadata
  }

  async call(fnName: string, fnParams: CallParams): Promise<CallResult> {
    throw new Error('not implemented');
  }

  input(): InputType {
    const event = this.opt.event as Record<string, string>
    if (!event.body) {
      throw new Error(`ill-formed event, got ${event}`)
    }

    return JSON.parse(event.body)
  }

  output(returnObject: any): object {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnObject)
    }
  }

}
