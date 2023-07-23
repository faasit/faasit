const express = require('express')
const { HTTP, CloudEvent } = require('cloudevents')

import { CloudEventTypes } from './gen/events'

const PORT = process.env.PORT || 8080

function main() {
  const app = express()

  app.post('/', (req, res) => {
    const receivedEvent = HTTP.toEvent({ headers: req.headers, body: req.body })
    console.log(`received event`, receivedEvent)
    const data = receivedEvent.data

    const sendEvent = new CloudEvent({
      type: CloudEventTypes.EchoEvent,
      source:
        'https://github.com/brody715/faasit/packages/faasit-examples/examples/knative-codegen1',
      data: { status: 'ok', payload: data },
    })

    const message = HTTP.binary(sendEvent)
    console.log(message.body)
    res.set(message.headers)
    res.status(200).send(message.body)
  })

  app.listen(PORT, function () {
    console.log(`Server starts at :${PORT}`)
  })
}

main()
