import * as vscode from 'vscode'
import { MemFS } from './memfs'

export function activate(context: vscode.ExtensionContext) {
  const memFs = new MemFS()
  context.subscriptions.push(memFs)
  memFs.seed()

  vscode.commands.executeCommand(
    'vscode.open',
    vscode.Uri.parse(`memfs:/sample-folder/example.ft`)
  )
}
