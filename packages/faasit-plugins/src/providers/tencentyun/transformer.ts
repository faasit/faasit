// For tencentyun provider, transform data from standard IR to params which tencentyun API can use.

import { FunctionTrigger, FunctionType } from '@faasit/std/src/faas'
import Admzip from 'adm-zip'

function zipFolderAndEncode(folderPath: string) {
  const zip = new Admzip()
  zip.addLocalFolder(folderPath)
  const zipBuffer = zip.toBuffer()
  const base64 = zipBuffer.toString('base64')
  return base64
}

export function transformCreateFunctionParams(fn: FunctionType) {
  return {
    FunctionName: fn.name,
    Code: {
      ZipFile: zipFolderAndEncode(fn.codeDir),
    },
    InstallDependency: 'TRUE',
    Handler: fn.handler,
    Runtime: fn.runtime,
    Role: fn.role,
  }
}

export function transformUpdateFunctionParams(fn: FunctionType) {
  return {
    FunctionName: fn.name,
    Code: {
      ZipFile: zipFolderAndEncode(fn.codeDir),
    },
    InstallDependency: 'TRUE',
    Handler: fn.handler,
  }
}

export function transformInvokeParams(funcName: string) {
  return {
    FunctionName: funcName,
  }
}

export function transformCreateTriggerParams(
  trigger: FunctionTrigger,
  funcName: string
) {
  const params = {
    FunctionName: funcName,
    TriggerName: trigger.name,
    Type: '',
    TriggerDesc: '',
  }
  switch (trigger.kind) {
    case 'http':
      params.Type = 'apigw'
      params.TriggerDesc = JSON.stringify({})
      break
  }

  return params
}
