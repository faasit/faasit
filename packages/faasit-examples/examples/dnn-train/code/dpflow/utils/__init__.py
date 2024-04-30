import functools
import logging
from typing import Any, Callable, Iterable, Optional, TypeVar


T = TypeVar("T")


def list_find(elems: Iterable[T], predict: Callable[[T], bool]) -> Optional[T]:
    for elem in elems:
        if predict(elem):
            return elem

    return None


def if_import(module):
    """If import module and execute function
    the decorated function will be executed immediately
    """

    def decorator(fn: Callable[[Any], Any]):
        @functools.wraps(fn)
        def wrapper():
            try:
                m = __import__(module)
                fn(m)
            except ImportError:
                pass

        return wrapper

    return decorator


def try_import(module) -> Optional[Any]:
    """Try import module, if failed, return None. If ok, return module."""
    try:
        m = __import__(module)
        return m
    except ImportError:
        return None


def disable_multi_thread():
    """try disable multhreading for common libraries"""

    @if_import("torch")
    def for_torch(m):
        m.set_num_threads(1)

    @if_import("cv2")
    def for_cv2(m):
        m.setNumThreads(0)


def estimate_byte_size(data: Any) -> int:
    if isinstance(data, (tuple, list)):
        return sum([estimate_byte_size(x) for x in data])

    if isinstance(data, dict):
        return sum([estimate_byte_size(x) for x in data.values()])

    if isinstance(data, (int, float)):
        return 4

    if isinstance(data, str):
        # For efficiency, we assume that the string is encoded in utf-8
        return len(data)

    if isinstance(data, (bytes, bytearray, memoryview)):
        return len(data)

    if (m := try_import("numpy")) and isinstance(data, m.ndarray):
        return data.nbytes

    if (m := try_import("torch")) and isinstance(data, m.Tensor):
        return data.element_size() * data.nelement()

    # unsupoorted type, default to 0
    return 0


def init_logger(level=logging.INFO, force: bool = False):
    logging.basicConfig(
        level=level, format="[%(levelname)s][%(name)s] %(message)s", datefmt='', force=force
    )


def str_datetime() -> str:
    import datetime

    now = datetime.datetime.now()
    return now.strftime("%Y%m%d-%H%M%S")


class DummyLogger:
    def __init__(self) -> None:
        pass

    def info(self, msg: object, *args: object,) -> None:
        return
