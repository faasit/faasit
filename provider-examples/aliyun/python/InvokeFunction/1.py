# -*- coding: utf-8 -*-
# This file is auto-generated, don't edit it. Thanks.
import os
import sys

from dotenv import load_dotenv,find_dotenv
load_dotenv(find_dotenv())
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
ENDPOINT = os.getenv("ENDPOINT")


from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open_20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient


class InvokeFunction:
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
    def create_api_info() :
        client = InvokeFunction.create_client(ACCESS_ID, ACCESS_KEY)
        invoke_function_headers = fc__open_20210406_models.InvokeFunctionHeaders()
        invoke_function_request = fc__open_20210406_models.InvokeFunctionRequest()
        runtime = util_models.RuntimeOptions()
        return client,invoke_function_headers,invoke_function_request,runtime

    @staticmethod
    def main() :
        client,invoke_function_headers,invoke_function_request,runtime = InvokeFunction.create_api_info()
        try:
            resp = client.invoke_function_with_options('testService', 'testFunction', invoke_function_request, invoke_function_headers, runtime)
            return resp
        except Exception as error:
            UtilClient.assert_as_string(error.message)
            print(error)



if __name__ == '__main__':
    resp =InvokeFunction.main()
    print(resp)