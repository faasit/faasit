const { HTTP, CloudEvent } = require('cloudevents')

const { CloudEventCreators, CloudEventTypes } = require('./gen/events')

const handle = async (context, body) => {
  context.log.info('query', context.query)
  context.log.info('body', body)

  if (context.method !== 'GET') {
    return { statusCode: 405, statusMessage: 'Method not allowed' }
  }

  const echoEvent = new CloudEvent({
    type: CloudEventTypes.EchoEvent,
    source: 'https://faasit.run/examples/hello1',
    data: CloudEventCreators.EchoEvent({ status: 'ok', payload: '' }),
  })

  const message = HTTP.binary(echoEvent)
  return {
    headers: message.headers,
    body: message.body,
  }
}

module.exports = { handle }
