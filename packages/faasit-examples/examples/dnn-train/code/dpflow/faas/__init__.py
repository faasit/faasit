# Adopt code from https://github.com/brody715/faasit for running serverless function on multiple providers
from functools import wraps
import os
from typing import Any, Callable
import logging

from dpflow.faas.runtime import FunctionContainerConf, FaasitRuntime, create_runtime

logger = logging.getLogger(__name__)


def function(fn: Callable[[FaasitRuntime], Any]) -> Callable:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        conf = FunctionContainerConf.parse_env(os.environ)
        runtime = create_runtime(conf, *args, **kwargs)
        return fn(runtime)

    return wrapper
