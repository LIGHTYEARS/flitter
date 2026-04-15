function Ti(T, R = globalThis.Deno ? globalThis.Deno.args : UaT.argv) {
  let a = T.startsWith("-") ? "" : T.length === 1 ? "-" : "--",
    e = R.indexOf(a + T),
    t = R.indexOf("--");
  return e !== -1 && (t === -1 || e < t);
}