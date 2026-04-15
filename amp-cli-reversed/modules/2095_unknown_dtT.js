function fk0(T) {
  return "state" in T;
}
function HXT(T, R) {
  let a = T.element.parent;
  while (a) {
    if (fk0(a) && a.state instanceof Ww) {
      if (R(a.state)) return;
    }
    a = a.parent;
  }
}
class dtT {
  invokeAction(T, R) {
    let a = this.findAction(T, R);
    if (a && a.enabled) return a.action.invoke(T);
    return null;
  }
  findAction(T, R) {
    let a = null;
    return HXT(R, e => {
      let t = e.getActionForIntent(T);
      if (!t) return !1;
      return a = {
        action: t,
        enabled: t.isEnabled(T)
      }, !0;
    }), a;
  }
}