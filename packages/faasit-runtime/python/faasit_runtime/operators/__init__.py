from typing import Any, Callable, Awaitable
import asyncio


async def batchParallel (
    input: list[Any],
    action: Callable[[list[Any],int], Awaitable[Any]],
    batch_size: int = 2
) -> Awaitable[Any]: 
    result = []
    promises : list[Awaitable[Any]]= []
    for i in range(0, len(input), batch_size):
        batch = input[i:i+batch_size]
        task = asyncio.create_task(action(batch,i))
        task.add_done_callback(lambda t: result.extend(t.result()))
        promises.append(task)
    await asyncio.gather(*promises)
    return result

async def tree_join(
    input: list[Any],
    action: Callable[[list[Any]], Awaitable[Any]],
    joiner_size: int = 2
) -> Awaitable[Any]:
    if len(input) <= joiner_size or joiner_size == 1:
        return await action(input)

    result = []
    promise = []

    each_size = len(input) // joiner_size
    for i in range(joiner_size):
        batch = input[i*each_size:] if i == joiner_size - 1 else input[i*each_size:(i+1)*each_size]    

        task = asyncio.create_task(tree_join(batch, action, joiner_size))

        task.add_done_callback(lambda t: result.append(t.result()))
        promise.append(task)

    await asyncio.gather(*promise)
    return await action(result)

import math

async def forkjoin (
    input: list[Any],
    work: Callable[[list[Any],int], Any],
    join: Callable[[list[Any]], Any],
    worker_size: int = 2,
    joiner_size: int = 2
): 
    worker_batch_size = math.ceil(len(input) / worker_size)
    results1 = await batchParallel(input, work, worker_batch_size)

    res = await tree_join(results1, join, joiner_size)

    return res

__all__ = [
    "batchParallel",
    "forkjoin",
    "tree_join"
]