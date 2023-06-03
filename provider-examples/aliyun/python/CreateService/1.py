# -*- coding: utf-8 -*-
# 本函数展示了如何创建一个最简单的服务
import os
import json


from alibabacloud_tea_openapi.client import Client as OpenApiClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_openapi_util.client import Client as OpenApiUtilClient
from alibabacloud_tea_util import models as util_models

from dotenv import load_dotenv,find_dotenv
load_dotenv(find_dotenv())
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
ENDPOINT = os.getenv("ENDPOINT")


class CreateService:
    def __init__(self):
        pass

    @staticmethod
    def create_client(
        access_key_id: str,
        access_key_secret: str,
    ) -> OpenApiClient:
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
        return OpenApiClient(config)

    @staticmethod
    def create_api_info() -> open_api_models.Params:
        """
        API 相关
        @param path: params
        @return: OpenApi.Params
        """
        params = open_api_models.Params(
            # 接口名称,
            action='CreateService',
            # 接口版本,
            version='2021-04-06',
            # 接口协议,
            protocol='HTTPS',
            # 接口 HTTP 方法,
            method='POST',
            auth_type='AK',
            style='FC',
            # 接口 PATH,
            pathname=f'/2021-04-06/services',
            # 接口请求体内容格式,
            req_body_type='json',
            # 接口响应体内容格式,
            body_type='json'
        )
        return params
    
    @staticmethod
    def create_params():
        client = CreateService.create_client(ACCESS_ID, ACCESS_KEY)
        params = CreateService.create_api_info()
        # body params
        body = OpenApiUtilClient.array_to_string_with_specified_style({
            'description': 'This is a test service', # 函数描述
            'serviceName': 'testService'
        }, 'body', 'json')
        # runtime options
        runtime = util_models.RuntimeOptions()
        request = open_api_models.OpenApiRequest(
            body=body
        )
        return client,params,request,runtime

    @staticmethod
    def main() -> dict:
        client,params,request,runtime = CreateService.create_params()
        # 返回值为 Map 类型，可从 Map 中获得三类数据：响应体 body、响应头 headers、HTTP 返回的状态码 statusCode。
        resp = client.call_api(params, request, runtime)
        return resp



if __name__ == '__main__':
    resp = CreateService.main()
    print(json.dumps(resp,indent=4))