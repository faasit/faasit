# -*- coding: utf-8 -*-
# 本函数展示了如何获取已经创建的服务信息
import os


from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open_20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

from dotenv import load_dotenv,find_dotenv
load_dotenv(find_dotenv())
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
ENDPOINT = os.getenv("ENDPOINT")



class GetService:
    def __init__(self):
        pass

    @staticmethod
    def create_client(
        access_key_id: str,
        access_key_secret: str,
    ) -> FC_Open20210406Client:
        """
        使用AK&SK初始化账号Client
        @param access_key_id:
        @param access_key_secret:
        @return: Client
        @throws Exception
        """
        config = open_api_models.Config(
            access_key_id=access_key_id,
            access_key_secret=access_key_secret
        )
        # 访问的域名
        config.endpoint = ENDPOINT
        return FC_Open20210406Client(config)
    
    @staticmethod
    def create_api_info():
        client = GetService.create_client(ACCESS_ID,ACCESS_KEY)
        get_service_headers = fc__open_20210406_models.GetServiceHeaders()
        get_service_request = fc__open_20210406_models.GetServiceRequest()
        runtime = util_models.RuntimeOptions()
        return client,get_service_headers,get_service_request,runtime

    @staticmethod
    def main() -> None:
        client,get_service_headers,get_service_request,runtime = GetService.create_api_info()
        try:
            resp = client.get_service_with_options('testService', get_service_request, get_service_headers, runtime)
            return resp
        except Exception as error:
            UtilClient.assert_as_string(error.message)
            print(error.message)


import json
if __name__ == '__main__':
    resp = GetService.main()
    resp = resp.to_map()
    print(json.dumps(resp,indent=4))