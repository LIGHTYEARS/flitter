function d40(T) {
  if (CIT) return;
  let R = new RJT(T);
  tPR(R), CIT = !0;
}
class aJT {
  async runInTerminal(T, R) {
    let a = d9.instance.tuiInstance;
    if (a.isInitialized() && !a.isSuspended()) a.suspend();
    try {
      await new Promise((e, t) => {
        let r = E40(T, {
          shell: !0,
          cwd: R,
          stdio: "inherit"
        });
        r.on("exit", h => {
          if (h === 0) e();else t(Error(`Command failed with exit code ${h}`));
        }), r.on("error", h => {
          t(h);
        });
      });
    } finally {
      if (a.isInitialized()) a.resume();
    }
  }
}