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
    // TODO: aws event may have many types, need to transform
    // https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
    // Currently for invoke api, it's an object
    return this.opt.event as InputType
  }

  output(returnObject: any): object {
    return returnObject
  }

}
