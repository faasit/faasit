from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path

@function
def message_receive(frt: FaasitRuntime):

    """
    尝试申请128MB内存空间
    可能触发MemoryError异常，异常处理交由调用方
    Returns:
        bytearray: 分配的内存块
    """
    mem_size = 128 * 1024 * 1024  # 计算字节数 128MB = 128*1024KB = 128*1024*1024B

    bytearray(mem_size)  # 尝试分配内存，失败时自动抛出MemoryError

    _end = round(time.time()*1000)
    _out = {
        "_end":_end
    }

    return frt.output(_out)

handler = create_handler(message_receive)