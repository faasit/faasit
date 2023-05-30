import * as vscode from "vscode";

export function getFaasitConfig(uri?: vscode.Uri) {
  return getConfig("faasit", uri);
}

export function getConfig(
  section: string,
  uri?: vscode.Uri | null
): vscode.WorkspaceConfiguration {
  if (!uri) {
    if (vscode.window.activeTextEditor) {
      uri = vscode.window.activeTextEditor.document.uri;
    } else {
      uri = null;
    }
  }
  return vscode.workspace.getConfiguration(section, uri);
}

export function makeEvent(): {
  set(): void;
  is_set(): boolean;
  wait(): Promise<void>;
} {
  const state = {
    setted: false,
    resolver: () => {},
  };

  const waitPromise = new Promise<void>((resolve) => {
    state.resolver = resolve;
  });

  return {
    set() {
      state.setted = true;
      state.resolver();
    },
    is_set() {
      return state.setted;
    },
    wait() {
      return waitPromise;
    },
  };
}

export function makeRestartHandler<Ctx>(opts: {
  init: () => Ctx;
  onStart: (ctx: Ctx) => Promise<void>;
  onStop: (ctx: Ctx) => Promise<void>;
}): {
  run: () => Promise<void>;
  restart: () => Promise<void>;
  dispose: () => Promise<void>;
} {
  let ctx = opts.init();

  let state = {
    restartCnt: 0,
    allToStop: makeEvent(),
    onceToStop: makeEvent(),
  };

  const run = async () => {
    while (true) {
      // everytime, we create a new event
      state.onceToStop = makeEvent();

      if (state.allToStop.is_set()) {
        break;
      }

      console.log(`RestartHandler: run once`);
      // continue run until stopped
      await opts.onStart(ctx).catch((e) => console.error(e));
      await Promise.race([state.onceToStop.wait(), state.allToStop.wait()]);

      state.restartCnt += 1;
      if (state.restartCnt > 10) {
        console.log(`restart more than ${state.restartCnt}, exit`)
        return;
      }
    }

    console.log(`RestartHandler: run finished`);
  };

  const restart = async () => {
    console.log(`RestartHandler: restart called`);
    await opts.onStop(ctx).catch((e) => console.error(e));
    state.onceToStop.set();
  };

  const dispose = async () => {
    state.onceToStop.set();
    state.allToStop.set();
    await opts.onStop(ctx).catch((e) => console.error(e));
  };

  return {
    run,
    restart,
    dispose: dispose,
  };
}
