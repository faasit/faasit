import { Application } from './faas'
import { ir } from './ir'

export interface PluginRuntime {
  runCommand(cmd: string): Promise<{ stdout: string; stderr: string }>

  joinPath(...path: string[]): string
  writeFile(path: string, content: string): Promise<void>
  removeFile(path: string): Promise<void>
}

export interface PluginLogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, options?: { error?: Error | null }): void
}

export interface PluginContext {
  rt: PluginRuntime
  logger: PluginLogger
}

export interface Plugin {
  name: string

  deploy?: (
    input: {
      app: Application
    },
    ctx: PluginContext
  ) => Promise<void>

  invoke?: (
    input: {
      app: Application
      funcName: string
    },
    ctx: PluginContext
  ) => Promise<void>
}
