export const MemFsProto = "faasit-fs"

export type MemFsItem = MemFsDir | MemFsFile

export interface MemFsDir {
  kind: "dir"
  name: string
  items: MemFsItem[]
};

export interface MemFsFile {
  kind: "file"
  name: string
  content: string
}

export interface MemLibrary {
  id: string
  root: MemFsDir
}

export function loadPackage(lib: MemLibrary, packageUri: string): {
  uri: string,
  files: MemFsFile[]
} {
  throw new Error(`unimplemented`)
}
