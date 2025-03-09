from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import os

def get_container_cpu_limit():
    """返回容器分配的 CPU 核数（若未限制则返回宿主机核心数）"""
    # 尝试 cgroup v2
    cpu_max_path = "/sys/fs/cgroup/cpu.max"
    if os.path.exists(cpu_max_path):
        with open(cpu_max_path, 'r') as f:
            quota, period = f.read().strip().split()
            if quota == 'max':
                return os.cpu_count()
            return int(quota) // int(period)
    
    # 尝试 cgroup v1
    quota_path = "/sys/fs/cgroup/cpu/cpu.cfs_quota_us"
    period_path = "/sys/fs/cgroup/cpu/cpu.cfs_period_us"
    if os.path.exists(quota_path) and os.path.exists(period_path):
        with open(quota_path, 'r') as f:
            quota = int(f.read().strip())
        with open(period_path, 'r') as f:
            period = int(f.read().strip())
        if quota == -1:
            return os.cpu_count()
        return max(1, quota // period)
    
    # 回退到宿主机核心数
    return os.cpu_count()


# @with_timestamp
@function
async def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)

    n = get_container_cpu_limit()
    
    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":n
    }

    return frt.output(_out)

handler = create_handler(f)

