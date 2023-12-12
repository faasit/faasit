import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406'
import { createClient } from './client'
import Admzip from 'adm-zip'
import * as $Util from '@alicloud/tea-util'

export class AliyunFunction {
  client: FC_Open20210406
  constructor(readonly functionName: string,
    readonly codeDir: string,
    readonly runtime: string,
    readonly handler: string,
    readonly env: { [key: string]: any } | undefined) {
    this.client = createClient()
  }

  private zipFolderAndEncode() {
    const zip = new Admzip();
    zip.addLocalFolder(this.codeDir);
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
      functionName: this.functionName,
      handler: this.handler,
      runtime: this.runtime,
      code: code,
      environmentVariables: this.env
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.client.createFunctionWithOptions(
        "faasit",
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
      const resp = await this.client.getFunction("faasit", this.functionName, getFunctionRequests);
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
      functionName: this.functionName,
      handler: this.handler,
      runtime: this.runtime,
      code: code,
      environmentVariables: this.env
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.client.updateFunctionWithOptions(
        "faasit",
        this.functionName,
        requests,
        headers,
        runtime);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async invoke(): Promise<$FC_Open20210406.InvokeFunctionResponse | undefined> {
    let invokeFunctionRequests = new $FC_Open20210406.InvokeFunctionRequest({});
    try {
      const resp = await this.client.invokeFunction("faasit", this.functionName, invokeFunctionRequests);
      return resp;
    } catch (error) {
      throw error;
    }
  }
}