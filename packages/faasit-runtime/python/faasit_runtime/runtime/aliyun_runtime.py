import time
from faasit_runtime.runtime import FaasitRuntime
from alibabacloud_fc_open20210406.client import Client as FC_Open20210406Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_fc_open20210406 import models as fc__open20210406_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient
from typing import Any, List
import os
import json
from dotenv import load_dotenv,find_dotenv
from faasit_runtime.runtime.faasit_runtime import StorageMethods
import oss2

# 获取用户进程中的环境变量文件
load_dotenv(find_dotenv(usecwd=True))
def helper_invoke_aliyun_function(fnName: str, event: Any):
    config = open_api_models.Config(
        access_key_id=os.environ['FAASIT_SECRET_ALIYUN_ACCESS_KEY_ID'],
        access_key_secret=os.environ['FAASIT_SECRET_ALIYUN_ACCESS_KEY_SECRET']
    )
    config.endpoint = f"{os.environ['FAASIT_SECRET_ALIYUN_ACCOUNT_ID']}.{os.environ['FAASIT_SECRET_ALIYUN_REGION']}.fc.aliyuncs.com"
    
    client = FC_Open20210406Client(config)
    invoke_func_req = fc__open20210406_models.InvokeFunctionRequest(
        body=UtilClient.to_bytes(event or {}),
    )
    return client.invoke_function('faasit', fnName, invoke_func_req)

class AliyunRuntime(FaasitRuntime):
    name: str = 'aliyun'
    def __init__(self, arg0, arg1) -> None:
        super().__init__()
        self.event = arg0
        self.context = arg1
        self._storage = self.AliyunStorage()

    def input(self):
        return json.loads(self.event)

    def output(self, data):
        return data

    def call(self, fn_name:str, event: Any):
        result = helper_invoke_aliyun_function(fn_name, event)
        result = str(result.body)
        return json.loads(result)

    async def tell(self):
        pass

    class AliyunStorage(StorageMethods):
        def __init__(self):
            auth = oss2.Auth(os.environ['ALIBABA_CLOUD_ACCESS_KEY_ID'], 
                            os.environ['ALIBABA_CLOUD_ACCESS_KEY_SECRET'])
            endpoint = f'https://{os.environ["ALIBABA_CLOUD_OSS_REGION"]}.aliyuncs.com'
            self.bucket = oss2.Bucket(auth, 
                            endpoint, 
                            os.environ['ALIBABA_CLOUD_OSS_BUCKET_NAME'])

        def put(self, filename, data: bytes) -> None:
            res = self.bucket.put_object(filename, data)
            if 200 <= res.resp.status < 300:
                print(f"[storage put] Put data into {filename} successfully.")
            else:
                print(res)

        def get(self, filename, timeout = -1) -> bytes:
            start_t = time.time()
            while not self.bucket.object_exists(filename):
                time.sleep(0.001)
                if timeout > 0:
                    if time.time() - start_t > timeout / 1000: return None
            return self.bucket.get_object(filename).read()

        def list(self) -> List:
            return [sbj.key for sbj in self.bucket.list_objects_v2().object_list]

        def exists(self, filename: str) -> bool:
            return self.bucket.object_exists(filename)

        def delete(self, filename: str) -> None:
            if self.bucket.object_exists(filename):    
                self.bucket.delete_object(filename)
                print(f"[storage delete] Delete {filename} successfully.")
            else:
                print(f"[storage delete] {filename} is not exist.")
                