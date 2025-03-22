from faasit_runtime import function, FaasitRuntime, workflow, Workflow
import re
import time
from faasit_runtime.utils.logging import log

@function
def split(rt: FaasitRuntime):
    start_time = time.time()
    _input = rt.input()
    split_num = _input.get('split_num', 3)
    data_file = _input.get('data_file', 'data.txt')
    store = rt.storage
    data = store.get(data_file)

    words = re.split(r'[\s,\.]', data)
    log.info(f"{len(words)} words in total")
    log.info(f"{type(words)}")

    words_keys = []

    for i in range(split_num):
        store.put(f'words_{i}', words[i*len(words)//split_num:(i+1)*len(words)//split_num])
        words_keys.append(f'words_{i}')

    end_time = time.time()

    return rt.output({
        'words_keys': words_keys,
        'time': end_time-start_time
    })


@function
def mapper(rt: FaasitRuntime):
    start_time = time.time()
    _input = rt.input()
    taskno = _input.get('taskno')
    store = rt.storage
    words_key = f'words_{taskno}'
    words = store.get(words_key)

    word_counts = {}
    for word in words:
        if word in word_counts:
            word_counts[word] += 1
        else:
            word_counts[word] = 1
    
    store.put(f'word_counts_{taskno}', word_counts)
    end_time = time.time()
    return rt.output({
        'output': f"word_counts_{taskno}",
        'time': end_time - start_time
    })

@function
def reducer(rt: FaasitRuntime):
    start_time = time.time()
    _input = rt.input()
    store = rt.storage
    word_counts = {}
    _file = None # final output file
    for k,v in _input.items():
        if not k.startswith('reducer'):
            continue
        _file = v
        word_count = store.get(v)
        for word in word_count:
            if word in word_counts:
                word_counts[word] += word_count[word]
            else:
                word_counts[word] = word_count[word]

    end_time = time.time()
    return rt.output({
        "time": end_time-start_time,
        'output': _file
    })

@workflow
def wordcount(wf:Workflow):
    _in = wf.input()
    split_num = _in.get('split_num', 20)
    data_file = _in.get('data_file', 'data.txt')

    split_resp = wf.call('split', {'split_num': split_num, 'data_file': data_file})
    
    results = []
    for i in range(split_num):
        result = wf.call('mapper', {'taskno': i, 'split': split_resp})

        results.append(result)

    dependency = {}
    for i,result in enumerate(results):
        # timeresults[f"mapper-{i}"] = result['time']
        dependency[f'reducer_{i}'] = result


    def reducer(**kwargs):
        def solve(start, end):
            if start == end:
                return kwargs[f'reducer_{start}']['output']
            mid = (start + end) // 2
            result1 = solve(start, mid)
            result2 = solve(mid+1, end)
            depend = {}
            depend['reducer_0'] = result1
            depend['reducer_1'] = result2
            result =  wf.frt.call('reducer', {**depend})
            return result['output']
        return solve(0,split_num-1)
    result = wf.func(reducer, **dependency)

    return result

split = split.export()
mapper = mapper.export()
reducer = reducer.export()
wordcount = wordcount.export()
# print(wordcount({}))