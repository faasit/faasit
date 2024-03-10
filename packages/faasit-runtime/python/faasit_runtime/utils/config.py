from pydantic import BaseModel
from typing import Literal
import os

class WorkflowSchema(BaseModel):
    funcName: str = ''

class FunctionContainerConfigSchema(BaseModel):
    funcName: str
    # one of the providers
    provider: Literal['local', 'aliyun','knative','aws','local-once']
    workflow: WorkflowSchema

def get_function_container_config():
    # Read the env from the environment
    env = os.environ

    config : FunctionContainerConfigSchema = FunctionContainerConfigSchema(
        funcName=env['FAASIT_FUNC_NAME'],
        provider=env['FAASIT_PROVIDER'],
        workflow=WorkflowSchema(
            funcName=env.get('FAASIT_WORKFLOW_FUNC_NAME') or ''
        )
    )
    return config.dict()