from faasit_runtime import function, FaasitRuntime, workflow
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

@function
def baseline(rt: FaasitRuntime):
    _input = rt.input()
    split_num = _input['split_num']
    data_file = _input.get('data_file', 'data.txt')

    finalresults = {}
    split_resp = rt.call('split', {'split_num': split_num, 'data_file': data_file})

    finalresults['split'] = split_resp['time']

    map_times = []
    mapper_outputs = []
    for i in range(split_num):
        result = rt.call('mapper', {'taskno': i, 'split': split_resp})
        mapper_outputs.append(result['output'])
        map_times.append(result['time'])

    finalresults['map'] = map_times

    reduce_times = []
    def solve(start, end):
        if start == end:
            return mapper_outputs[start]
        mid = (start + end) // 2
        result1 = solve(start, mid)
        result2 = solve(mid+1, end)
        result = rt.call('reducer', {'reducer_1': result1, 'reducer_2': result2})
        reduce_times.append(result['time'])
        return result['output']
        
    solve(0, split_num-1)
    finalresults['reduce'] = reduce_times

    return rt.output(finalresults)

split = split.export()
mapper = mapper.export()
reducer = reducer.export()
baseline = baseline.export()