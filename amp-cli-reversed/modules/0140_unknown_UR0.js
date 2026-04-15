function NR0() {
  return Vx("actor-runtime");
}
function EyT(T) {
  throw NR0().error({
    msg: "unreachable",
    value: `${T}`,
    stack: Error().stack
  }), new f1R(T);
}
function UR0(...T) {
  let R = T.filter(r => r !== void 0);
  if (R.length === 0) return {
    signal: void 0,
    cleanup: () => {}
  };
  if (R.length === 1) return {
    signal: R[0],
    cleanup: () => {}
  };
  let a = new AbortController();
  if (R.some(r => r.aborted)) return a.abort(), {
    signal: a.signal,
    cleanup: () => {}
  };
  let e = () => {
      for (let r of R) r.removeEventListener("abort", t);
    },
    t = () => {
      a.abort(), e();
    };
  for (let r of R) r.addEventListener("abort", t, {
    once: !0
  });
  return {
    signal: a.signal,
    cleanup: e
  };
}