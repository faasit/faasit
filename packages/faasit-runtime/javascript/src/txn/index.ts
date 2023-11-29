import * as crypto from 'crypto'
import { CoreResult } from '../type'

export interface TccExecutor<T, R> {
  try(payload: T): Promise<CoreResult<R> & { txnID: string }>
  confirm(): Promise<void>
  cancel(): Promise<void>
}

export function CreateTccExecutor<T, R>(item: {
  tryFn: (p: { txnID: string; payload: T }) => Promise<CoreResult<R>>
  confirmFn?: (p: { txnID: string, res: CoreResult<R> }) => Promise<void>
  cancelFn: (p: { txnID: string, res: CoreResult<R> }) => Promise<void>
}): TccExecutor<T, R> {

  let txnID: string | undefined = undefined
  let tryResult: CoreResult<R> | undefined = undefined

  return {
    async try(payload) {
      if (txnID) {
        throw new Error(`tcc already tried`)
      }

      txnID = crypto.randomUUID()
      tryResult = await item.tryFn({
        txnID, payload
      })

      // ok
      return { ...tryResult, txnID }
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
