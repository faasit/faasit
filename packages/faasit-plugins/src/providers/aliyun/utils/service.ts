import FC_Open20210406, * as $FC_Open20210406 from '@alicloud/fc-open20210406'
import { createClient } from './client'
import * as $Util from '@alicloud/tea-util'

export class AliyunService {
  serviceName: string
  client: FC_Open20210406
  constructor() {
    this.client = createClient()
    this.serviceName = 'faasit'
  }

  async create(): Promise<
    $FC_Open20210406.CreateServiceResponse |
    undefined> {
    let headers = new $FC_Open20210406.CreateServiceHeaders({});
    let request = new $FC_Open20210406.CreateServiceRequest({
      serviceName: this.serviceName,
    })
    let runtime = new $Util.RuntimeOptions({});
    try {
      let resp = await this.client.createServiceWithOptions(
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
      const resp = await this.client.getServiceWithOptions(
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