# -*- coding: utf-8 -*-
# 本示例演示如何创建http触发器
import os
import json

from dotenv import find_dotenv,load_dotenv

from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open_20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient
load_dotenv(find_dotenv())
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
ENDPOINT = os.getenv("ENDPOINT")

class CreateTrigger:
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
            # 必填，您的 AccessKey ID,
            access_key_id=access_key_id,
            # 必填，您的 AccessKey Secret,
            access_key_secret=access_key_secret
        )
        # 访问的域名
        config.endpoint = ENDPOINT
        return FC_Open20210406Client(config)
    
    @staticmethod
    def create_api_info():
        client = CreateTrigger.create_client(ACCESS_ID,ACCESS_KEY)
        create_trigger_headers = fc__open_20210406_models.CreateTriggerHeaders()
        create_trigger_request = fc__open_20210406_models.CreateTriggerRequest(
            trigger_type='http',
            trigger_name='testTrigger',
            trigger_config=json.dumps({
                "methods" : ["POST","GET","PUT","DELETE"],
                "disableURLInternet" : False
            })
        )
        runtime = util_models.RuntimeOptions()
        return client,create_trigger_headers,create_trigger_request,runtime

    @staticmethod
    def main() :
        client,create_trigger_headers,create_trigger_request,runtime = CreateTrigger.create_api_info()
        try:
            resp = client.create_trigger_with_options('testService', 'testFunction', create_trigger_request, create_trigger_headers, runtime)
            return resp
        except Exception as error:
            UtilClient.assert_as_string(error.message)
            print(error)



if __name__ == '__main__':
    resp = CreateTrigger.main()
    resp = resp.to_map()
    print(json.dumps(resp,indent=4))