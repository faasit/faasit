from lucas import function, create_handler, Runtime

@function
def hello(rt: Runtime):
    return rt.output(rt.input())

hello = hello.export()