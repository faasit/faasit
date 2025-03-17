from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import os
from typing import List

from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open_20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

class Sample:
    def __init__(self):
        pass

    @staticmethod
    def create_client() -> FC_Open20210406Client:
        """
        使用AK&SK初始化账号Client
        @return: Client
        @throws Exception
        """
        # 工程代码泄露可能会导致 AccessKey 泄露，并威胁账号下所有资源的安全性。以下代码示例仅供参考。
        # 建议使用更安全的 STS 方式，更多鉴权访问方式请参见：https://help.aliyun.com/document_detail/378659.html。
        config = open_api_models.Config(
            # 必填，请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID。,
            access_key_id=os.environ['ALIBABA_CLOUD_ACCESS_KEY_ID'],
            # 必填，请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_ACCESS_KEY_SECRET。,
            access_key_secret=os.environ['ALIBABA_CLOUD_ACCESS_KEY_SECRET']
        )
        # Endpoint 请参考 https://api.aliyun.com/product/FC-Open
        config.endpoint = f'1763003154614289.cn-hangzhou.fc.aliyuncs.com'
        return FC_Open20210406Client(config)

    @staticmethod
    def update(n: int):
        client = Sample.create_client()
        update_function_headers = fc__open_20210406_models.UpdateFunctionHeaders()
        update_function_request = fc__open_20210406_models.UpdateFunctionRequest(
            memory_size=n
        )
        runtime = util_models.RuntimeOptions()
        try:
            # 复制代码运行请自行打印 API 的返回值
            client.update_function_with_options('faasit', 'workload', update_function_request, update_function_headers, runtime)
            return round(time.time()*1000)
        except Exception as error:
            pass

    @staticmethod
    def get_function():
        client = Sample.create_client()
        get_function_headers = fc__open_20210406_models.GetFunctionHeaders()
        get_function_request = fc__open_20210406_models.GetFunctionRequest(
            qualifier='LATEST'
        )
        runtime = util_models.RuntimeOptions()
        try:
            # 复制代码运行请自行打印 API 的返回值
            config = client.get_function_with_options('faasit', 'workload', get_function_request, get_function_headers, runtime)
            return config.to_map()['body']['memorySize']
        except Exception as error:
            pass

# @with_timestamp
@function
def f(frt: FaasitRuntime):

    t = Sample.get_function()

    _start = Sample.update(t * 2)

    tt = Sample.get_function()
    while tt == t:
        tt = Sample.get_function()

    _end = round(time.time()*1000)

    Sample.update(t)
    
    _out = {
        "_begin":_start,
        "_end":_end
    }

    return frt.output(_out)

handler = create_handler(f)

