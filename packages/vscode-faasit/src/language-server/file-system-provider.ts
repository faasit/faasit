
import * as vscode from 'vscode';
import { builtins } from '@faasit/core';

export class FaasitFileSystemProvider implements vscode.FileSystemProvider {

  static register(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.registerFileSystemProvider(builtins.FsProto, new FaasitFileSystemProvider(), {
        isReadonly: true,
        isCaseSensitive: false
      }));
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const date = Date.now();
    return {
      ctime: date,
      mtime: date,
      size: Buffer.from(builtins.FileCore).length,
      type: vscode.FileType.File
    };
  }

  readFile(uri: vscode.Uri): Uint8Array {
    // We could return different libraries based on the URI
    // We have only one, so we always return the same
    return new Uint8Array(Buffer.from(builtins.FileCore));
  }

  // The following class members only serve to satisfy the interface

  private readonly didChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile = this.didChangeFile.event;

  watch() {
    return {
      dispose: () => { }
    };
  }

  readDirectory(): [] {
    throw vscode.FileSystemError.NoPermissions();
  }

  createDirectory() {
    throw vscode.FileSystemError.NoPermissions();
  }

  writeFile() {
    throw vscode.FileSystemError.NoPermissions();
  }

  delete() {
    throw vscode.FileSystemError.NoPermissions();
  }

  rename() {
    throw vscode.FileSystemError.NoPermissions();
  }
}