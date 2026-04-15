async function DK(T) {
  var R, a, e, t, r;
  let h = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) h.push(T);else if (K6T(T)) h.push(T instanceof Blob ? T : await T.arrayBuffer());else if (bER(T)) try {
    for (var i = !0, c = ec(T), s; s = await c.next(), R = s.done, !R; i = !0) {
      t = s.value, i = !1;
      let A = t;
      h.push(...(await DK(A)));
    }
  } catch (A) {
    a = {
      error: A
    };
  } finally {
    try {
      if (!i && !R && (e = c.return)) await e.call(c);
    } finally {
      if (a) throw a.error;
    }
  } else {
    let A = (r = T === null || T === void 0 ? void 0 : T.constructor) === null || r === void 0 ? void 0 : r.name;
    throw Error(`Unexpected data type: ${typeof T}${A ? `; constructor: ${A}` : ""}${pdR(T)}`);
  }
  return h;
}