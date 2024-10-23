const { createFunction } = require('@faasit/runtime')
const { TccTxn, df } = require('@faasit/runtime')

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

  const buyTrainTicket = TccTxn.CreateTccTask({
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

  const reserveFlight = TccTxn.CreateTccTask({
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

  const reserveHotel = TccTxn.CreateTccTask({
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


  const runManually = async () => {
    // parallel try
    const [r1, r2, r3] = await Promise.all([
      buyTrainTicket.try({}),
      reserveFlight.try({}),
      reserveHotel.try({})
    ])

    if (r1.ok && r2.ok && r3.ok) {
      await Promise.all([
        buyTrainTicket.confirm(),
        reserveFlight.confirm(),
        reserveHotel.confirm()
      ])
      return { ok: true, logs }
    } else {

      // rollback
      await Promise.all([
        buyTrainTicket.cancel(),
        reserveFlight.cancel(),
        reserveHotel.cancel()
      ])

      return { ok: false, logs }
    }
  }

  const res = await TccTxn
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