const { createFunction } = require('@faasit/runtime')
const { txn, df } = require('@faasit/runtime')

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

const CancelFlight = createFunction(async (frt) => {
  return frt.output({})
})

const CancelTrainTicket = createFunction(async (frt) => {
  return frt.output({})
})

const CancelHotel = createFunction(async (frt) => {
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

  const buyTrainTicket = txn.CreateTccTask({
    tryFn: async ({ txnID }) => {
      addLog(`Try TrainTicket`, txnID)
      const r1 = await frt.call('BuyTrainTicket', { input: { control } })
      return r1.output
    },
    confirmFn: async ({ txnID }) => {
      addLog(`Confirm TrainTicket`, txnID)
    },
    cancelFn: async ({ txnID, res }) => {
      addLog(`CancelTrainTicket`, txnID, res.error)
      await frt.call('CancelTrainTicket', { input: { control, txnID } })
    }
  })

  const reserveFlight = txn.CreateTccTask({
    tryFn: async ({ txnID }) => {
      addLog(`Try ReserveFlight`, txnID)
      const r1 = await frt.call(`ReserveFlight`, { input: { control } })
      return r1.output
    },
    confirmFn: async ({ txnID }) => {
      addLog(`Confirm ReserveFlight`, txnID)
    },
    cancelFn: async ({ txnID, res }) => {
      addLog(`CancelFlight`, txnID, res.error)
      await frt.call(`CancelFlight`, { input: { control, txnID } })
    }
  })

  const reserveHotel = txn.CreateTccTask({
    tryFn: async ({ txnID }) => {
      addLog(`Try ReserveHotel`, txnID)
      const r1 = await frt.call('ReserveHotel', { input: { control } })
      return r1.output
    },
    confirmFn: async ({ txnID }) => {
      addLog(`Confirm ReserveHotel`, txnID)
    },
    cancelFn: async ({ txnID, res }) => {
      addLog(`CancelHotel`, txnID, res.error)
      await frt.call(`CancelHotel`, { input: { control, txnID } })
    }
  })

  const res = await txn
    .WithTcc({ buyTrainTicket, reserveFlight, reserveHotel })
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

module.exports = { BuyTrainTicket, ReserveFlight, ReserveHotel, CancelFlight, CancelTrainTicket, CancelHotel, executor }