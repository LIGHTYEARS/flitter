function JC0() {
  let T = null;
  return {
    pluginExecutorKind: "remote",
    setNotifyForwarder(R) {
      T = R;
    },
    async notify(R) {
      if (J.debug("headless plugin notification: %s", R), !T) return;
      try {
        await T(R);
      } catch (a) {
        J.error("headless plugin notify forwarder failed", {
          error: a
        });
      }
    },
    async open(R) {
      throw Error("pluginPlatform.open is not supported in headless mode");
    },
    async input(R) {
      throw Error("pluginPlatform.input is not supported in headless mode");
    },
    async confirm(R) {
      throw Error("pluginPlatform.confirm is not supported in headless mode");
    },
    async ask(R) {
      throw Error("pluginPlatform.ask is not supported in headless mode");
    }
  };
}