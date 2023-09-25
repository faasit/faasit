export declare var CloudEventTypes: {
  EchoEvent: 'example.echo'
  EchoEvent2: 'example.echo'
}

export declare var CloudEventCreators: {
  EchoEvent: (d: EchoEvent) => EchoEvent
  EchoEvent2: (d: EchoEvent2) => EchoEvent2
}

export interface EchoEvent {
  status: string
  payload: any
}

export interface EchoEvent2 {
  status: string
}

