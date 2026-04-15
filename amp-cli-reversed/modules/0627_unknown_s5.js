async function* s5(T, R = !0) {
  for (let a of T) if ("stream" in a) yield* a.stream();else if (ArrayBuffer.isView(a)) {
    if (R) {
      let e = a.byteOffset,
        t = a.byteOffset + a.byteLength;
      while (e !== t) {
        let r = Math.min(t - e, xAT),
          h = a.buffer.slice(e, e + r);
        e += h.byteLength, yield new Uint8Array(h);
      }
    } else yield a;
  } else {
    let e = 0,
      t = a;
    while (e !== t.size) {
      let r = await t.slice(e, Math.min(t.size, e + xAT)).arrayBuffer();
      e += r.byteLength, yield new Uint8Array(r);
    }
  }
}