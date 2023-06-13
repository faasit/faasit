import { runtime, URI, UriUtils } from '@faasit/core'
import fs from 'fs'

export type NodeTextEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'latin1'

export class NodeFileSystemProvider implements runtime.FileSystemProvider {
  encoding: NodeTextEncoding = 'utf-8'

  readFile(uri: URI): Promise<string> {
    return fs.promises.readFile(uri.fsPath, this.encoding)
  }

  readFileSync(uri: URI): string {
    return fs.readFileSync(uri.fsPath, this.encoding)
  }
  async readDirectory(folderPath: URI): Promise<runtime.FileSystemNode[]> {
    const dirents = await fs.promises.readdir(folderPath.fsPath, {
      withFileTypes: true,
    })
    return dirents.map((dirent) => ({
      dirent, // Include the raw entry, it may be useful...
      isFile: dirent.isFile(),
      isDirectory: dirent.isDirectory(),
      uri: UriUtils.joinPath(folderPath, dirent.name),
    }))
  }
}
