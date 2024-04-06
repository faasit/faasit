import { BaseFaasitRuntime, InputType, CallParams, CallResult, StorageMethods, TellParams, TellResult, FaasitRuntimeMetadata } from "./FaasitRuntime";
import { WorkflowFunc } from "../Workflow"
import { LowLevelDurableClient, IsDurableOrchestratorFlag, waitOrchestratorResult } from "../durable";
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);
const existsAsync = (filePath: string): Promise<boolean> =>
  new Promise(resolve => {
    fs.access(filePath, fs.constants.F_OK, err => resolve(!err));
  });

// Run function in a local and unit scope
export class LocalOnceRuntime extends BaseFaasitRuntime {

  name: string = "local-once";
  private storagePath = './local_storage/';

  funcMap: Map<string, WorkflowFunc> = new Map()
  constructor(private funcs: WorkflowFunc[], private data: { input: InputType, metadata: FaasitRuntimeMetadata }) {
    super()
    for (const func of funcs) {
      this.funcMap.set(func.name, func)
    }
  }

  metadata(): FaasitRuntimeMetadata {
    return this.data.metadata
  }

  input(): InputType {
    return this.data.input
  }

  output(returnObject: any): object {
    return returnObject
  }

  async call(fnName: string, fnParams: CallParams): Promise<CallResult> {
    const func = this.funcMap.get(fnName)
    if (!func) {
      throw new Error(`unknown function to call, name=${fnName}`)
    }

    console.log(`function called, name=${fnName}, seq=${fnParams.sequence || 0}`)

    const metadata = this.helperCollectMetadata('call', fnName, fnParams)
    // call locally and recusively
    const frt = new LocalOnceRuntime(this.funcs, { input: fnParams.input, metadata })
    const data = await func.handler(frt)

    // polling and wait for result
    if (data instanceof IsDurableOrchestratorFlag) {
      const result = await waitOrchestratorResult(frt, data.orchestratorId, {})
      return { output: result }
    }

    return { output: data }
  }

  async tell(fnName: string, fnParams: TellParams): Promise<TellResult> {
    const func = this.funcMap.get(fnName)
    if (!func) {
      throw new Error(`unknown function to tell, name=${fnName}`)
    }

    console.log(`function tell, name=${fnName}, responseCtx=${!!fnParams.responseCtx}`)

    const metadata = this.helperCollectMetadata('tell', fnName, fnParams)
    const frt = new LocalOnceRuntime(this.funcs, { input: fnParams.input, metadata })

    // create task but no wait
    const task = async () => {
      await func.handler(frt)
    }
    task()

    // return directly
    return {}
  }

  storage: StorageMethods = {
    put: async (filename: string, data: Buffer): Promise<void> => {
      if (!await existsAsync(this.storagePath)) {
        await fs.mkdirSync(this.storagePath, { recursive: true });
      }
      const filePath = path.join(this.storagePath, filename);
      await writeFileAsync(filePath, data);
      console.log(`[Info] Put data into ${filePath} successfully.`);
    },

    get: async (filename: string, timeout = -1): Promise<Buffer | null> => {
      const filePath = path.join(this.storagePath, filename);
      const startT = Date.now();
      
      while (!(await existsAsync(filePath))) {
        await new Promise(resolve => setTimeout(resolve, 1));
        if (timeout > 0 && Date.now() - startT > timeout) return null;
      }
      while (true) {
        const data = await readFileAsync(filePath);
        if (data.length === 0) {
          console.log("Local runtime: read error, retry ...");
          await new Promise(resolve => setTimeout(resolve, 1));
          continue;
        }
        return data;
      }
    },

    list: async (): Promise<string[]> => {
      return readdirAsync(this.storagePath);
    },

    exists: async (filename: string): Promise<boolean> => {
      const filePath = path.join(this.storagePath, filename);
      return existsAsync(filePath);
    },

    del: async (filename: string): Promise<void> => {
      const filePath = path.join(this.storagePath, filename);
      if (await existsAsync(filePath)) {
        await unlinkAsync(filePath);
      }
      console.log(`[Info] Delete ${filePath} successfully.`);
    }
  };

  get extendedFeatures() {
    return LocalOnceRuntime.extendedFeaturesStatic
  }

  static extendedFeaturesStatic = {
    durable: () => {
      return new LocalOnceDurableClient()
    }
  }
}

class LocalOnceDurableClient implements LowLevelDurableClient {
  static stores: Map<string, unknown> = new Map()
  private stores = LocalOnceDurableClient.stores

  async set(key: string, value: unknown): Promise<void> {
    console.log(`[Trace] LocalOnceDurableClient set key = ${key}, value =`, value)
    this.stores.set(key, value)
  }
  async get<T = unknown>(key: string, defaultFn?: (() => T) | undefined): Promise<T | undefined> {
    let value = this.stores.get(key) as T
    if (!value && defaultFn) {
      value = defaultFn()
      this.stores.set(key, value)
    }

    return value
  }
}
