class nQ {
  pluginExecutorKind = "unknown";
  showToast = null;
  appendToThreadHandler = null;
  notifyForwarder = null;
  showOpenedURLToast = null;
  showInputDialog = null;
  showConfirmDialog = null;
  configService;
  constructor(T) {
    this.configService = T.configService;
  }
  setNotifyForwarder(T) {
    this.notifyForwarder = T;
  }
  async notify(T) {
    if (this.notifyForwarder) try {
      await this.notifyForwarder(T);
      return;
    } catch (R) {
      J.error("plugin notify forwarder failed, falling back to local notification", {
        error: R
      });
    }
    if (this.showToast) this.showToast(T);else J.debug("plugin notification (TUI not loaded): %s", T);
  }
  async open(T) {
    let R = QC0(),
      a = R === "darwin" ? "open" : R === "win32" ? "start" : "xdg-open";
    if (await new Promise((e, t) => {
      YC0(`${a} ${JSON.stringify(T)}`, r => {
        if (r) t(r);else e();
      });
    }), this.showOpenedURLToast) this.showOpenedURLToast(T);else Ay.write(`
Opened URL: ${T}

`);
  }
  async input(T) {
    if (this.showInputDialog) return this.showInputDialog(T);
    Ay.write(`
Input requested: ${T.title ?? "Input"}
`), Ay.write(`Input dialogs are not available outside the TUI

`);
    return;
  }
  async confirm(T) {
    if (this.showConfirmDialog) return this.showConfirmDialog(T);
    return Ay.write(`
Confirmation requested: ${T.title}
`), Ay.write(`Confirm dialogs are not available outside the TUI, defaulting to false

`), !1;
  }
  async ask(T) {
    try {
      return await ZC0(T, this.configService);
    } catch (R) {
      return Ay.write(`
Error asking AI: ${R instanceof Error ? R.message : String(R)}

`), {
        result: "uncertain",
        probability: 0.5,
        reason: "Error calling AI"
      };
    }
  }
  async appendToThread(T) {
    if (this.appendToThreadHandler) await this.appendToThreadHandler(T);else throw Error("appendToThread is not available - no active thread");
  }
}