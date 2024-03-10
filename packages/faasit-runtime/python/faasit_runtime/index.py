from faasit_runtime.runtime.faasit_runtime import FaasitRuntime
from faasit_runtime.runtime.aliyun_runtime import AliyunRuntime
from faasit_runtime.runtime.local_runtime import LocalRuntime
from faasit_runtime.runtime.local_once_runtime import LocalOnceRuntime
from faasit_runtime.utils.config import get_function_container_config


def function(fn):
    # Read Config for different runtimes
    containerConf = get_function_container_config()

    match containerConf['provider']:
        case 'local':
            def local_function(event):
                frt = LocalRuntime(event)
                return fn(frt)
            return local_function
        case 'aliyun':
            def aliyun_function(arg0, arg1, arg2):
                frt = AliyunRuntime(arg0, arg1, arg2)
                return fn(frt)
            return aliyun_function
        case 'knative':
            frt = FaasitRuntime(containerConf)
        case 'aws':
            frt = FaasitRuntime(containerConf)
        case 'local-once':
            def local_function(event):
                frt = LocalOnceRuntime(event)
                return fn(frt)
            return local_function
        case _:
            raise ValueError(f"Invalid provider {containerConf['provider']}")

    