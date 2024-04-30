import time
from typing import Generator, Iterable, Iterator, List, TypeVar
import torch


def limit_threads():
    try:
        import cv2  # type: ignore

        cv2.setNumThreads(0)
    except ImportError:
        pass

    import torch

    torch.set_num_threads(1)


def torch_clear_cache():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


class ElapsedTimer(object):
    def __init__(self) -> None:
        self._start_ns = time.perf_counter_ns()

    def reset(self):
        self._start_ns = time.perf_counter_ns()

    def elapsed_ns(self):
        return time.perf_counter_ns() - self._start_ns

    def elapsed_us(self):
        return self.elapsed_ns() / 1000

    def elapsed_ms(self):
        return self.elapsed_ns() / 1000000

    def elapsed_secs(self):
        return self.elapsed_ns() / 1000000000


class StepTimer(object):
    def __init__(self) -> None:
        self._prev_ns = time.perf_counter_ns()
        self._start_ns = time.perf_counter_ns()

    def step_elapsed_ns(self):
        now = time.perf_counter_ns()
        ret = now - self._prev_ns
        self._prev_ns = now
        return ret

    def step_elapsed_us(self):
        return self.step_elapsed_ns() / 1000

    def total_elapsed_ns(self):
        return time.perf_counter_ns() - self._start_ns

    def total_elapsed_us(self):
        return self.total_elapsed_ns() / 1000

    def total_elapsed_ms(self):
        return self.total_elapsed_ns() / 1000000


class AverageMeter(object):
    """Computes and stores the average and current value
    Imported from https://github.com/pytorch/examples/blob/master/imagenet/main.py#L247-L262
    """

    def __init__(self):
        self.reset()

    def reset(self):
        self.min = 0
        self.max = 0
        self.val = 0
        self.avg = 0
        self.sum = 0
        self.count = 0

    def update(self, val, n=1):
        self.val = val
        self.sum += val * n
        self.count += n
        self.avg = self.sum / self.count
        self.min = min(val, self.min)
        self.max = max(val, self.max)


def accuracy(output, target, topk=(1,)):
    import torch

    """Computes the accuracy over the k top predictions for the specified values of k"""
    with torch.no_grad():
        maxk = max(topk)
        batch_size = target.size(0)

        _, pred = output.topk(maxk, 1, True, True)
        pred = pred.t()
        correct = pred.eq(target.view(1, -1).expand_as(pred))

        res = []
        for k in topk:
            correct_k = correct[:k].reshape(-1).float().sum(0, keepdim=True)
            res.append(correct_k.mul_(100.0 / batch_size))
        return res


def get_torch_device(device: str = ""):
    import torch

    if device:
        return torch.device(device)

    if torch.cuda.is_available():
        return torch.device("cuda")

    if torch.backends.mps and torch.backends.mps.is_available():  # type: ignore
        return torch.device("mps")

    return torch.device("cpu")


def enable_fast_cudnn():
    import torch.backends.cudnn as cudnn
    cudnn.deterministic = False
    cudnn.benchmark = True


def is_torch_device_gpu(device: str):
    if device.startswith("cpu"):
        return False
    return True


_T = TypeVar("_T")


def iter_batched(iter: Iterable[_T], batch_size: int) -> Iterator[List[_T]]:
    metas = []
    for data in iter:
        metas.append(data)

        if len(metas) >= batch_size:
            yield metas
            metas = []

    if len(metas) > 0:
        yield metas
