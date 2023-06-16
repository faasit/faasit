/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Diagnostic } from 'vscode-languageserver/browser'
import { startLanguageServer, EmptyFileSystem, DocumentState } from 'langium'
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  NotificationType,
} from 'vscode-languageserver/browser'
import { services } from '@faasit/core'

declare var self: unknown

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self)
const messageWriter = new BrowserMessageWriter(self)

const connection = createConnection(messageReader, messageWriter)

// Inject the shared services and language-specific services
const { shared, faasit } = services.createFaasitServices({
  connection: connection as any,
  ...EmptyFileSystem,
})

// Start the language server with the shared services
startLanguageServer(shared)

// Send a notification with the serialized AST after every document change
type DocumentChange = {
  uri: string
  content: string
  diagnostics: Diagnostic[]
}
const documentChangeNotification = new NotificationType<DocumentChange>(
  'browser/DocumentChange'
)
const jsonSerializer = faasit.serializer.JsonSerializer
shared.workspace.DocumentBuilder.onBuildPhase(
  DocumentState.Validated,
  (documents) => {
    for (const document of documents) {
      const json = jsonSerializer.serialize(document.parseResult.value)
      connection.sendNotification(documentChangeNotification, {
        uri: document.uri.toString(),
        content: json,
        diagnostics: document.diagnostics ?? [],
      })
    }
  }
)