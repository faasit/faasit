from faasit_runtime import durable
from faasit_runtime.durable.runtime import DurableRuntime
from faasit_runtime.txn import sagaTask, WithSaga, frontend_recover
import random
@durable
def handler(df: DurableRuntime):

    results = []
    def reverseHotel(txnID, payload):
        if 'reverseHotel' not in results:
            results.append("reverseHotel")
        flag = random.choice([True,False])
        if flag == True:
            return payload
        else:
            print("random error")
            raise Exception("random error")
    def compensateHotel(txnID, result):
        results.remove("reverseHotel")
    

    def reverseFlight(txnID, payload):
        if 'reverseFlight' not in results:
            results.append("reverseFlight")
        flag = random.choice([True,False])
        if flag == True:
            return payload
        else:
            print("random error")
            raise Exception("random error")
    def compensateFlight(txnID, result):
        results.remove("reverseFlight")
    
    def reverseCar(txnID, payload):
        if 'reverseCar' not in results:
            results.append("reverseCar")
        flag = random.choice([True,False])
        if flag == True:
            return payload
        else:
            print("random error")
            raise Exception("random error")
    def compensateCar(txnID, result):
        results.remove("reverseCar")

    task_hotel = sagaTask(reverseHotel, compensateHotel)
    task_flight = sagaTask(reverseFlight, compensateFlight)
    task_car = sagaTask(reverseCar, compensateCar)
    result = WithSaga([task_hotel, task_flight, task_car], frontend_recover(5))
    result = result("payload")
    return df.output({
        'result': results
    })

handler = handler.export()