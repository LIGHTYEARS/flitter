function gA(T) {
  let R = vX.get(T);
  if (!R) R = new Cm(), vX.set(T, R);
  return R;
}
function o7R(T) {
  if (T = jX.parse(T), T.old_str === T.new_str) throw Error("old_str and new_str must be different from each other.");
}
function mmT(T) {
  return T.replace(/\\\\n/g, "\\n").replace(/\\\\t/g, "\\t").replace(/\\\\/g, "\\").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, `
`).replace(/\\t/g, "\t");
}
async function A7R(T, R, a, e, t = !1, r) {
  if (/\[REDACTED:[a-zA-Z-]+\]/.test(a)) throw Error("The edit string contains a redaction marker. Please identify a different edit location that does not contain redacted content.");
  R = N_(R);
  let h = R,
    i = N_(a),
    c = N_(e);
  if (t) {
    if (!h.includes(i)) throw Error("Could not find exact match for old_str");
    h = h.replaceAll(i, () => c);
  } else {
    let n = h.indexOf(i);
    if (n !== -1) {
      if (h.indexOf(i, n + i.length) !== -1) throw Error(`found multiple matches for edit ${JSON.stringify(a)}`);
      h = h.replace(i, () => c);
    } else {
      let p = (m, b) => {
          let y = m.split(`
`),
            u = h.split(`
`);
          for (let P = 0; P <= u.length - y.length; P++) {
            let k = u.slice(P, P + y.length);
            if (y.every((x, f) => {
              let v = k[f];
              return x.trim() === v.trim();
            })) {
              let x = u[P].match(/^\s*/)?.[0] || "",
                f = (b.match(/^\s*/) || [""])[0],
                v = b.split(`
`).map(g => {
                  if (g === "") return g;
                  let I = (g.match(/^\s*/) || [""])[0],
                    S = I.startsWith(f) ? I.slice(f.length) : "",
                    O = g.slice(I.length);
                  return x + S + O;
                });
              return u.splice(P, y.length, ...v), h = u.join(`
`), !0;
            }
          }
          return !1;
        },
        _ = p(i, c);
      if (!_) {
        let m = N_(mmT(a)),
          b = N_(mmT(e));
        h = R, _ = p(m, b);
      }
      if (!_) throw Error("Could not find exact match for old_str");
    }
  }
  let s = $A(R, h, T),
    A = SWT(s),
    l = 0,
    o = 0;
  if (t) l = 1, o = h.split(`
`).length;else if (h.includes(c)) {
    let n = h.indexOf(c);
    l = (h.substring(0, n).match(/\n/g) || []).length + 1;
    let p = (c.match(/\n/g) || []).length;
    o = l + p;
  } else o = h.split(`
`).length;
  return {
    modifiedContent: h,
    formattedDiff: A,
    lineRange: [l, o]
  };
}