from faasit_runtime import function, workflow, create_handler
import pickle
from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowBuilder

@function
async def executor(frt: FaasitRuntime):
    _in = frt.input()
    filename = _in["filename"]

    frt.storage.delete(filename)

    # put -> get -> list -> delete
    frt.storage.put(filename, pickle.dumps('123'))
    res1 = pickle.loads(frt.storage.get(filename))
    print(res1) # '123'
    print(frt.storage.list()) # [fileName]
    frt.storage.delete(filename)

    # list, exists, get when file is not exist
    print(frt.storage.list()) # []
    print(frt.storage.exists(filename)) # false
    print(frt.storage.get(filename, 1000)) # None after 1s

    return frt.output({
        'message' : 'ok'
    })

@workflow
def word_count_workflow(wf: WorkFlowBuilder):
    wf.executor().set_handler(executor)
    return wf.build()

handler = create_handler(word_count_workflow)
