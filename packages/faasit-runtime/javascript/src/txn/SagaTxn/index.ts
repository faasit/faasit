import * as crypto from 'crypto'
import { CoreError, CoreResult } from '../../type'

export function CreateSagaTask<T, R>(item: {
  operateFn: (p: { txnID: string; payload: T }) => Promise<CoreResult<R>>
  compensateFn: (p: { txnID: string, res: CoreResult<R> }) => Promise<void>
}): SagaTask<T, R> {

  let txnID: string | undefined = undefined
  let operateResult: CoreResult<R> | undefined = undefined

  return {
    async operate(txnId, payload) {
      if (txnID) {
        throw new Error(`saga already tried`)
      }
      txnID = txnId;
      operateResult = await item.operateFn({
        txnID, payload
      })

      // ok
      return operateResult;
    },

    async compensate() {
      if (!txnID || !operateResult) {
        throw new Error(`saga not tried`)
      }

      // compensate
      await item.compensateFn({ txnID, res: operateResult })
    }
  }
}

export type SagaRunResult<R> = {
  status: 'ok'
  result: R
} | {
  status: 'failed'
}

// WithSaga 函数使用上述类型
export function WithSaga<Tasks extends Record<string, SagaTask<any, any>>>(
  tasks: Tasks
): {
  Run<R>(
    fn: (tx: SagaTransactionContext<Tasks>) => Promise<R>
  ): Promise<SagaRunResult<R>>;
} {
  return {
    async Run(fn) {
      // TODO: exception handling
      const manager = new SagaManager()

      const txnID = manager.createTxnID();

      const executors = Object.fromEntries(Object.entries(tasks).map(([k, v]) => {
        return [k, manager.addTask(txnID, v)]
      })) as SagaExecutors<Tasks>

      const tx: SagaTransactionContext<Tasks> = {
        exec: executors,
      }

      const res = await fn(tx)
      await manager.finalize()

      if (manager.hasError) {
        return { status: 'failed' }
      }
      return { status: 'ok', result: res }
    },
  };
}

export interface SagaTask<T, R> {
  operate(txnId: string, payload: T): Promise<CoreResult<R>>
  compensate(): Promise<void>
}

export type SagaExecutor<T, R> = (payload: T) => Promise<CoreResult<R>>

type SagaTaskRecord = Record<string, SagaTask<any, any>>

// SagaExecutors 类型，将 SagaTask 元组转换为 SagaExecutor 元组
type SagaExecutors<Tasks extends SagaTaskRecord> = {
  [I in keyof Tasks]: Tasks[I] extends SagaTask<infer T, infer R>
  ? SagaExecutor<T, R>
  : never;
};

export interface SagaTransactionContext<Tasks extends SagaTaskRecord> {
  exec: SagaExecutors<Tasks>
}


// private helpers
class SagaManager {
  private _triedTasks: SagaTask<unknown, unknown>[] = []
  private _hasError: boolean = false

  get hasError() { return this._hasError }

  createTxnID(): string {
    return crypto.randomUUID();
  }

  addTask<T, R>(txnID: string, task: SagaTask<T, R>): SagaExecutor<T, R> {
    return async (payload: T) => {
      // no need to operate if one has error
      if (this._hasError) {
        return { ok: false, error: { code: "SAGA_ERROR", detail: "previous task is already error" } }
      }

      const res = await task.operate(txnID, payload)
      this._triedTasks.push(task)

      if (res.error) {
        this._hasError = true
      }

      return res
    }
  }

  async finalize() {
    if (this._hasError) {
      for (let i = this._triedTasks.length - 1; i >= 0; i--) {
        await this._triedTasks[i].compensate();
      }
    }
  }
}