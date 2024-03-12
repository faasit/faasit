from faasit_runtime import function, workflow, create_handler
from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowBuilder
from faasit_runtime.operators import forkjoin
import re

@function
def count(frt: FaasitRuntime):
    _in = frt.input()
    words = _in["words"]
    
    counter = {}
    for word in words:
        if word in counter:
            counter[word] += 1
        else:
            counter[word] = 1
    return frt.output({
        "counter": list(counter.items())
    })

@function
def sort(frt: FaasitRuntime):
    _in = frt.input()
    counterArray = _in["counter"]

    counter = {}
    for arr in counterArray:
        if arr[0] not in counter:
            counter[arr[0]] = 0
        counter[arr[0]] += arr[1]

    reducedCounter = list(counter.items())
    reducedCounter.sort(key=lambda x: x[1], reverse=True)

    return frt.output({
        "sorted": reducedCounter
    })

@function
def split(frt: FaasitRuntime):
    _in = frt.input()
    text: str = _in["text"]

    words = re.split(r'[\s,\.]', text)
    
    return frt.output({
        'message' : 'ok',
        'words': words
    })

@function
async def executor(frt: FaasitRuntime):
    _in = frt.input()
    text: str = _in["text"]
    try:
        batchSize = _in['batchSize']
    except KeyError:
        batchSize = 10
    
    words = frt.call('split', {'text': text})['words']

    async def work(words):
        result = await frt.call('count', {'words': words})
        return result['counter']
    async def join(counter):
        return await frt.call('sort', {'counter': counter})['counter']
    result = await forkjoin(
        input=words,
        work=work,
        join=join,
        worker_size=batchSize,
        joiner_size=2
    )

    return frt.output({
        'message' : 'ok',
        'result': result
    })

@workflow
def word_count_workflow(wf: WorkFlowBuilder):
    wf.func('split').set_handler(split)
    wf.func('count').set_handler(count)
    wf.func('sort').set_handler(sort)

    wf.executor().set_handler(executor)
    return wf.build()

handler = create_handler(word_count_workflow)
