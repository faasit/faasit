"use strict";

import * as net from "net";
import * as os from "os";
import * as path from "path";

import {Disposable, ExtensionContext, workspace} from "vscode";
import * as vscode from "vscode";
import {Trace} from "vscode-jsonrpc";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import {getFaasitConfig, makeRestartHandler} from "./utils";

// remote is used for debug
interface MyLanguageClient {
  start(): Promise<void>;
  dispose(): Promise<void>;
}

export function createLanguageClient(
  context: ExtensionContext
): MyLanguageClient {
  const config = getFaasitConfig();

  const lspMode = config.get<"local" | "remote">("lspMode", "local");
  const lspPort = config.get("lspPort", 25007);
  const clientName = "FaasIt Language Server";

  if (lspMode == "local") {
    // The server is a locally installed in src/faasit
    let launcher =
      os.platform() === "win32" ? "faasit-standalone.bat" : "faasit-standalone";
    let script = context.asAbsolutePath(
      path.join("src", "faasit", "bin", launcher)
    );

    let serverOptions: ServerOptions = {
      run: {command: script},
      debug: {
        command: script,
        args: [],
        options: {
          env: {
            // jdwp port, default=no
            JAVA_OPTS: `-Xdebug -Xrunjdwp:server=n,transport=dt_socket,address=8000,suspend=n,quiet=y`,
            ...process.env,
          },
        },
      },
    };

    let clientOptions: LanguageClientOptions = {
      documentSelector: ["faasit"],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher("**/*.*"),
      },
    };

    // Create the language client and start the client.
    const lc = new LanguageClient(clientName, serverOptions, clientOptions);
    lc.setTrace(Trace.Verbose);

    return lc;
  }

  if (lspMode == "remote") {
    const connectionInfo = {
      port: lspPort,
    };

    const serverOptions: ServerOptions = async () => {
      const socket = net.connect(connectionInfo);
      return {
        writer: socket,
        reader: socket,
      };
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: ["faasit"],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher("**/*.*"),
      },
    };

    const lc = new LanguageClient(clientName, serverOptions, clientOptions);
    lc.setTrace(Trace.Verbose);

    return {
      start() {
        return lc.start();
      },
      async dispose() {
        // do nothing
        // NOTICE: if we call lc.stop(), the remote server will also stopped, it's not ok for debug
        // NOTICE: It may leak the resource of connections
      },
    };
  }

  throw Error(`unknown lsp mode: ${lspMode}`);
}

let disposable: {dispose(): any} | undefined;

export function activate(context: ExtensionContext) {
  const handler = makeRestartHandler<{
    lc: MyLanguageClient | undefined;
  }>({
    init() {
      return {lc: undefined};
    },
    async onStart(ctx) {
      const lc = createLanguageClient(context);
      ctx.lc = lc;
      await lc.start();
    },
    async onStop(ctx) {
      if (ctx.lc) {
        ctx.lc.dispose();
      }
      ctx.lc = undefined;
    },
  });

  handler.run();

  // register commands
  {
    const dispose = vscode.commands.registerCommand(
      "faasit.restart",
      async () => {
        await handler.restart();
      }
    );

    context.subscriptions.push(dispose);
  }

  disposable = handler;
}

export function deactivate() {
  if (disposable) {
    disposable.dispose();
    disposable = undefined;
  }
}
