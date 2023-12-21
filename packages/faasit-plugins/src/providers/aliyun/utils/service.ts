import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406'
import { createClient } from './client'
import * as $Util from '@alicloud/tea-util'

export class AliyunService {
  constructor(private opt: {
    client: FC_Open20210406,
    serviceName: string
  }) {
  }

  async create(): Promise<
    $FC_Open20210406.CreateServiceResponse |
    undefined> {
    let headers = new $FC_Open20210406.CreateServiceHeaders({});
    let request = new $FC_Open20210406.CreateServiceRequest({
      serviceName: this.opt.serviceName,
    })
    let runtime = new $Util.RuntimeOptions({});
    try {
      let resp = await this.opt.client.createServiceWithOptions(
        request,
        headers,
        runtime);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async get(): Promise<$FC_Open20210406.GetServiceResponse | undefined> {
    let getServiceHeaders = new $FC_Open20210406.GetServiceHeaders({});
    let getServiceRequest = new $FC_Open20210406.GetServiceRequest({});
    let runtime = new $Util.RuntimeOptions({});
    try {
      const resp = await this.opt.client.getServiceWithOptions(
        "faasit",
        getServiceRequest,
        getServiceHeaders,
        runtime);
      return resp;
    } catch (error) {
      if (error.code != 'ServiceNotFound') {
        throw error;
      }
    }
  }
}