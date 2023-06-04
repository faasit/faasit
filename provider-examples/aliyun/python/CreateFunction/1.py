# -*- coding: utf-8 -*-
# 本示例演示了如何创建函数，通过上传zip压缩包的方式
import os
import sys
import base64

from dotenv import load_dotenv,find_dotenv

from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open_20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

load_dotenv(find_dotenv())
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
ENDPOINT = os.getenv("ENDPOINT")


class CreateFunction:
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
    def getBase64Code():
        with open(f"{os.path.dirname(sys.argv[0])}/code.zip",'rb') as file:
            zip_data = file.read()
        base64_data = base64.b64encode(zip_data)
        base64_str = base64_data.decode("utf-8")
        return base64_str
    
    @staticmethod
    def create_api_info() :
        client = CreateFunction.create_client(ACCESS_ID, ACCESS_KEY)
        create_function_headers = fc__open_20210406_models.CreateFunctionHeaders()
        code = fc__open_20210406_models.Code(
            zip_file=CreateFunction.getBase64Code()
        )
        create_function_request = fc__open_20210406_models.CreateFunctionRequest(
            description='This is a test function',
            function_name='testFunction',
            handler='index.handler',
            initialization_timeout=60,
            runtime='python3.9',
            code=code
        )
        runtime = util_models.RuntimeOptions()
        return client,create_function_headers,create_function_request,runtime

    @staticmethod
    def main():
        client,create_function_headers,create_function_request,runtime = CreateFunction.create_api_info()
        try:
            resp = client.create_function_with_options('testService', create_function_request, create_function_headers, runtime)
            return resp
        except Exception as error:
            UtilClient.assert_as_string(error.message)
            print(error)


import json
if __name__ == '__main__':
    resp = CreateFunction.main()
    resp = resp.to_map()
    print(json.dumps(resp,indent=4))