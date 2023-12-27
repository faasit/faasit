import * as crypto from 'crypto'
import { CoreError, CoreResult } from '../type'

export function CreateTccTask<T, R>(item: {
  tryFn: (p: { txnID: string; payload: T }) => Promise<CoreResult<R>>
  confirmFn?: (p: { txnID: string, res: CoreResult<R> }) => Promise<void>
  cancelFn: (p: { txnID: string, res: CoreResult<R> }) => Promise<void>
}): TccTask<T, R> {

  let txnID: string | undefined = undefined
  let tryResult: CoreResult<R> | undefined = undefined

  return {
    async try(txnId, payload) {
      if (txnID) {
        throw new Error(`tcc already tried`)
      }
      txnID = txnId;
      tryResult = await item.tryFn({
        txnID, payload
      })

      // ok
      return tryResult;
    },

    async confirm() {
      if (!txnID || !tryResult) {
        throw new Error(`tcc not tried`)
      }

      if (tryResult.error) {
        throw new Error(`failed to confirm when try has errors`)
      }

      if (item.confirmFn) {
        await item.confirmFn({ txnID, res: tryResult })
      }
    },

    async cancel() {
      if (!txnID || !tryResult) {
        throw new Error(`tcc not tried`)
      }

      // cancel
      await item.cancelFn({ txnID, res: tryResult })
    }
  }
}

export type TccRunResult<R> = {
  status: 'ok'
  result: R
} | {
  status: 'failed'
}

// WithTcc 函数使用上述类型
export function WithTcc<Tasks extends Record<string, TccTask<any, any>>>(
  tasks: Tasks
): {
  Run<R>(
    fn: (tx: TccTransactionContext<Tasks>) => Promise<R>
  ): Promise<TccRunResult<R>>;
} {
  return {
    async Run(fn) {
      // TODO: exception handling
      const manager = new TccManager()

      const txnID = manager.createTxnID();

      const executors = Object.fromEntries(Object.entries(tasks).map(([k, v]) => {
        return [k, manager.addTask(txnID, v)]
      })) as TccExecutors<Tasks>

      const tx: TccTransactionContext<Tasks> = {
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

export interface TccTask<T, R> {
  try(txnId: string, payload: T): Promise<CoreResult<R>>
  confirm(): Promise<void>
  cancel(): Promise<void>
}

export type TccExecutor<T, R> = (payload: T) => Promise<CoreResult<R>>

type TccTaskRecord = Record<string, TccTask<any, any>>

// TccExecutors 类型，将 TccTask 元组转换为 TccExecutor 元组
type TccExecutors<Tasks extends TccTaskRecord> = {
  [I in keyof Tasks]: Tasks[I] extends TccTask<infer T, infer R>
  ? TccExecutor<T, R>
  : never;
};

export interface TccTransactionContext<Tasks extends TccTaskRecord> {
  exec: TccExecutors<Tasks>
}


// private helpers
class TccManager {
  private _triedTasks: TccTask<unknown, unknown>[] = []
  private _hasError: boolean = false

  get hasError() { return this._hasError }

  createTxnID(): string {
    return crypto.randomUUID();
  }

  addTask<T, R>(txnID: string, task: TccTask<T, R>): TccExecutor<T, R> {
    return async (payload: T) => {
      // no need to try if one has error
      if (this._hasError) {
        return { ok: false, error: { code: "TCC_ERROR", detail: "previous task is already error" } }
      }

      const res = await task.try(txnID, payload)
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
        await this._triedTasks[i].cancel();
      }
    } else {
      for (let i = 0; i < this._triedTasks.length; i++) {
        await this._triedTasks[i].confirm();
      }
    }
  }
}