from abc import ABC, abstractmethod
import uuid
from ..type import CoreResult


def createTccTask(tryFn, confirmFn=None, cancelFn=None):

    txnID = None
    tryResult = None

    class InnerTccTask(TccTask):
        async def try(txn_id, payload):
            if txnID:
                raise RuntimeError("tcc already tried")
            txn_id = txnID
            tryResult = await tryFn(txnID, payload)

            # ok
            return tryResult

        async def confirm():
            if txnID is None or tryResult is None:
                raise RuntimeError("tcc not tried")

            if tryResult.error:
                raise RuntimeError("failed to confirm when try has errors")

            if confirmFn:
                await confirmFn(txnID, tryResult)

        async def cancel():
            if txnID is None or tryResult is None:
                raise RuntimeError("tcc not tried")

            # cancel
            if cancelFn:
                await item.cancelFn(txnID, tryResult)

    return InnerTccTask()

# tasks是TccTasks类型，本质是字典类型，k为函数名，v为函数
def withTcc(tasks):
    async def run(fn):
        manager = TccManager()
        txnID = manager.create_txn_id()
        
        executors = TccExecutors()
        for task in tasks.records.items():
            executors[task.k] = manager.add_task(txnID, v)

        tx = TccTransactionContext(executors)

        res = await fn(tx)
        await manager.finalize()
        if manager.has_error():
            return TccRunResult.createFailRunResult()

        return TccRunResult.createSuccessRunResult()

        
class TccTask(ABC):
    def try(txn_id, payload):
        pass

    def confirm():
        pass

    def cancel():
        pass
    

class TccTasks:
    def __init__(self):
        self.records = dict()


class TccRunResult:
    def __init__(self):
        self.status = None
        self.result = None
    
    @staticmethod
    def createSuccessRunResult(data):
        return TccRunResult("ok", data)

    @staticmethod
    def createFailRunResult():
        return TccRunResult("failed")


class TccExecutors(dict):
    def __init__(self, **kw):
        super().__init__(**kw)

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(r"'TccExecutors' object has no attribute '%s'" % key)

    def __setattr__(self, key, value):
        self[key] = value


class TccTransactionContext:
    def __init__(self, executors):
        self.exec = executors


class TccManager:
    def __init__(self):
        self._triedTasks = []
        self._hasError = False

    def has_error(self):
        return self._hasError

    def create_txn_id(self):
        return uuid.uuid4().hex

    def add_task(txnID, task):
        def fn(payload):
            if self._hasError:
                return CoreResult.createFailResult(code="TCC_ERROR", detail="previous task is already error")

            result = await task.try(txnID, payload)
            self._triedTasks.append(task)

            if result.error:
                self._hasError = True

            return result

    def finalize():
        if self._hasError:
            for i in range(self._triedTasks.length - 1, -1, -1):
                await this._triedTasks[i].cancel()
        else:
            for i in range(0, self._triedTasks.length):
                await this._triedTasks[i].confirm()

