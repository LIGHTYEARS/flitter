async function* RCR(T) {
  let R = new Uint8Array();
  for await (let a of T) {
    if (a == null) continue;
    let e = a instanceof ArrayBuffer ? new Uint8Array(a) : typeof a === "string" ? Z8T(a) : a,
      t = new Uint8Array(R.length + e.length);
    t.set(R), t.set(e, R.length), R = t;
    let r;
    while ((r = ZER(R)) !== -1) yield R.slice(0, r), R = R.slice(r);
  }
  if (R.length > 0) yield R;
}