function unR(T, R) {
  let a = d0(T),
    e = d0(R);
  if (a.startsWith("file:///") && e.startsWith("file:///")) return riT(a) === riT(e);
  return a === e;
}
function riT(T) {
  return T.replace(/^file:\/\/\/([A-Za-z]):/, R => `file:///${R.toLowerCase()}:`);
}
function ynR() {
  return knR;
}
function PnR(T) {
  let R = xl;
  return xl = T, R;
}
function Gy(T) {
  return (R, ...a) => {
    fD[T](R, ...a);
  };
}
class Sb {
  baseLogger;
  scope;
  context = {};
  constructor(T = fD) {
    this.baseLogger = T;
  }
  with(T) {
    let R = new Sb(this.baseLogger);
    return R.scope = this.scope, R.context = {
      ...this.context,
      ...T
    }, R;
  }
  scoped(T) {
    let R = new Sb(this.baseLogger);
    return R.scope = this.scope ? `${this.scope}.${T}` : T, R.context = {
      ...this.context
    }, R;
  }
  error(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.error(this.messageWithPrefix(T), ...a);
  }
  warn(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.warn(this.messageWithPrefix(T), ...a);
  }
  info(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.info(this.messageWithPrefix(T), ...a);
  }
  debug(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.debug(this.messageWithPrefix(T), ...a);
  }
  audit(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.audit(this.messageWithPrefix(T), ...a);
  }
  messageWithPrefix(T) {
    return this.scope ? `${this.scope}: ${T}` : T;
  }
  mergeContextWithMeta(T) {
    let R = {
        ...this.context
      },
      a = P2.trace.getActiveSpan();
    if (a) {
      let t = a.spanContext();
      if (t.traceId) R.traceId = t.traceId, R.spanId = t.spanId;
    }
    if (T.length === 0) return [R];
    let e = T[0];
    if (typeof e === "object" && e !== null) return [{
      ...e,
      ...R
    }, ...T.slice(1)];else return [R, ...T];
  }
}