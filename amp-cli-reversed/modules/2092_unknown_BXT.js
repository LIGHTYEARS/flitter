function kk0(T) {
  return T.type === "manual_bash_invocation";
}
function BXT(T, R = xk0) {
  function a(e) {
    let t = R[e];
    return t ? process.env[t] : void 0;
  }
  return {
    async get(e, t) {
      let r = a(e);
      return r !== void 0 && r !== "" ? r : T.get(e, t);
    },
    async set(e, t, r) {
      let h = a(e);
      if (h !== void 0 && h !== "") return;
      await T.set(e, t, r);
    },
    changes: T.changes
  };
}