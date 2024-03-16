import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406'
import Admzip from 'adm-zip'
import Util, * as $Util from '@alicloud/tea-util'

export class AliyunFunction {
  constructor(private opt: {
    client: FC_Open20210406,
    serviceName: string,
    functionName: string,
    codeDir: string,
    runtime: string,
    handler: string,
    env?: { [key: string]: any }
  }) {
  }

  private zipFolderAndEncode() {
    const zip = new Admzip();
    zip.addLocalFolder(this.opt.codeDir);
    const zipBuffer = zip.toBuffer();
    const base64 = zipBuffer.toString('base64');
    return base64;
  }

  async create(): Promise<$FC_Open20210406.CreateFunctionResponse | undefined> {
    let code = new $FC_Open20210406.Code({
      zipFile: this.zipFolderAndEncode(),
    })
    let createFunctionHeaders = new $FC_Open20210406.CreateFunctionHeaders({});
    let createFunctionRequests = new $FC_Open20210406.CreateFunctionRequest({
      functionName: this.opt.functionName,
      handler: this.opt.handler,
      runtime: this.opt.runtime,
      code: code,
      environmentVariables: this.opt.env
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.createFunctionWithOptions(
        this.opt.serviceName,
        createFunctionRequests,
        createFunctionHeaders,
        runtime);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async get(): Promise<{ [key: string]: any } | undefined> {
    let getFunctionRequests = new $FC_Open20210406.GetFunctionRequest({});
    try {
      const resp = await this.opt.client.getFunction(this.opt.serviceName, this.opt.functionName, getFunctionRequests);
      return resp;
    } catch (error) {
      if (error.code != 'FunctionNotFound') {
        throw error;
      }
    }
  }

  async update(): Promise<$FC_Open20210406.UpdateFunctionResponse | undefined> {
    let code = new $FC_Open20210406.Code({
      zipFile: this.zipFolderAndEncode()
    })
    let headers = new $FC_Open20210406.UpdateFunctionHeaders({});
    let requests = new $FC_Open20210406.UpdateFunctionRequest({
      functionName: this.opt.functionName,
      handler: this.opt.handler,
      runtime: this.opt.runtime,
      code: code,
      environmentVariables: this.opt.env
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.updateFunctionWithOptions(
        this.opt.serviceName,
        this.opt.functionName,
        requests,
        headers,
        runtime);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async invoke(event: any): Promise<$FC_Open20210406.InvokeFunctionResponse | undefined> {
    let invokeFunctionRequests = new $FC_Open20210406.InvokeFunctionRequest({
      body: event ? Util.toBytes(JSON.stringify(event)) : ''
    });
    try {
      const resp = await this.opt.client.invokeFunction(this.opt.serviceName, this.opt.functionName, invokeFunctionRequests);
      return resp;
    } catch (error) {
      throw error;
    }
  }
}