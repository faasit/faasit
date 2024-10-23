const { createFunction } = require('@faasit/runtime')
const { SagaTxn, df } = require('@faasit/runtime')

const BuyTrainTicket = createFunction(async (frt) => {
  const { control } = frt.input()

  if (control.BuyTrainTicket == "ok") {
    return frt.output({ ok: true, value: 1 })
  }
  return frt.output({ ok: false, error: { code: "400", detail: "refused" } })
})

const ReserveFlight = createFunction(async (frt) => {
  const { control } = frt.input()

  if (control.ReserveFlight == "ok") {
    return frt.output({ ok: true, value: 1 })
  }
  return frt.output({ ok: false, error: { code: "400", detail: "refused" } })
})

const ReserveHotel = createFunction(async (frt) => {
  const { control } = frt.input()

  if (control.ReserveHotel == "ok") {
    return frt.output({ ok: true, value: 1 })
  }
  return frt.output({ ok: false, error: { code: "400", detail: "refused" } })
})

const CompensateFlight = createFunction(async (frt) => {
  return frt.output({})
})

const CompensateTrainTicket = createFunction(async (frt) => {
  return frt.output({})
})

const CompensateHotel = createFunction(async (frt) => {
  return frt.output({})
})

const executor = createFunction(async (frt) => {
  const logs = []

  const addLog = (msg, txnID, error) => {
    let log = `${msg}, txnID=${txnID}`

    if (error) {
      log += `, error=${error.detail}`
    }
    logs.push(log)
  }

  const { control } = frt.input()

  const buyTrainTicket = SagaTxn.CreateSagaTask({
    operateFn: async ({ txnID }) => {
      addLog(`Operate BuyTrainTicket`, txnID)
      const r1 = await frt.call('BuyTrainTicket', { input: { control } })
      return r1.output
    },
    compensateFn: async ({ txnID, res }) => {
      addLog(`CompensateTrainTicket`, txnID, res.error)
      await frt.call('CompensateTrainTicket', { input: { control, txnID } })
    }
  })

  const reserveFlight = SagaTxn.CreateSagaTask({
    operateFn: async ({ txnID }) => {
      addLog(`Operate ReserveFlight`, txnID)
      const r1 = await frt.call(`ReserveFlight`, { input: { control } })
      return r1.output
    },
    compensateFn: async ({ txnID, res }) => {
      addLog(`CompensateFlight`, txnID, res.error)
      await frt.call(`CompensateFlight`, { input: { control, txnID } })
    }
  })

  const reserveHotel = SagaTxn.CreateSagaTask({
    operateFn: async ({ txnID }) => {
      addLog(`Operate ReserveHotel`, txnID)
      const r1 = await frt.call('ReserveHotel', { input: { control } })
      return r1.output
    },
    compensateFn: async ({ txnID, res }) => {
      addLog(`CompensateHotel`, txnID, res.error)
      await frt.call(`CompensateHotel`, { input: { control, txnID } })
    }
  })


  const runManually = async () => {
    // parallel operate
    const [r1, r2, r3] = await Promise.all([
      buyTrainTicket.operate({}),
      reserveFlight.operate({}),
      reserveHotel.operate({})
    ])

    if (r1.ok && r2.ok && r3.ok) {
      return { ok: true, logs }
    } else {

      // rollback
      await Promise.all([
        buyTrainTicket.compensate(),
        reserveFlight.compensate(),
        reserveHotel.compensate()
      ])

      return { ok: false, logs }
    }
  }

  const res = await SagaTxn
    .WithSaga({ buyTrainTicket, reserveFlight, reserveHotel })
    .Run(async (tx) => {
      const r1 = await tx.exec.buyTrainTicket()
      if (r1.error) {
        return
      }

      const r2 = await tx.exec.reserveFlight()
      if (r2.error) {
        return
      }

      return await tx.exec.reserveHotel()
    })

  return { ok: res.status === 'ok', logs }

})

module.exports = { BuyTrainTicket, ReserveFlight, ReserveHotel, CompensateFlight, CompensateTrainTicket, CompensateHotel, executor }