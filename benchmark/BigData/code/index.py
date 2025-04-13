from faasit_runtime import function, FaasitRuntime, workflow
import re
import time

@function
def split(rt: FaasitRuntime):
    _input = rt.input()
    text = _input['text']
    split_num = _input['split_num']

    words = re.split(r'[\s,\.]', text)
    results = []
    for i in range(split_num):
        result = words[i*len(words)//split_num:(i+1)*len(words)//split_num]
        results.append(result)


    return rt.output({
        'results': results
    })


@function
def mapper(rt: FaasitRuntime):
    _in = rt.input()
    text = _in['text']
    word_counts = {}
    for word in text:
        if word in word_counts:
            word_counts[word] += 1
        else:
            word_counts[word] = 1
    return rt.output({
        'results': word_counts
    })

@function
def reducer(rt: FaasitRuntime):
    _in = rt.input()
    mappers = _in['mapper']
    finalresults = {}
    for mapper in mappers:
        for word, count in mapper.items():
            if word in finalresults:
                finalresults[word] += count
            else:
                finalresults[word] = count
    # 选取最大的10个
    finalresults = dict(sorted(finalresults.items(), key=lambda item: item[1], reverse=True)[:10])
    return rt.output({
        'results': finalresults
    })

@function
def wordcount(rt: FaasitRuntime):
    _input = rt.input()
    split_num = _input.get("split_num", 3)
    file = _input['file']
    store = rt.storage
    text = store.get(file).decode('utf-8')

    text_list:list[str] = rt.call('split', {'split_num': split_num, 'text': text})['results']
    mapper_results = []
    for text in text_list:
        mapper_results.append(rt.call('mapper', {'text': text})['results'])
    
    results = rt.call("reducer", {"mapper": mapper_results})
        

    

    return rt.output(results)

split = split.export()
mapper = mapper.export()
reducer = reducer.export()
wordcount = wordcount.export()
# print(wordcount({"text": "Hello World this is is a happy day"}))