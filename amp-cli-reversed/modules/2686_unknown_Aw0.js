function P_(T, R, a) {
  for (let e = 0; e < R.length; e++) if (R[e] !== T[a + e + 1]) return !1;
  return !0;
}
function jg(T) {
  if (iW(T)) return T;else throw Error(`Invalid entity name ${T}`);
}
function Aw0(T, R = {}) {
  if (R = Object.assign({}, lw0, R), !T || typeof T !== "string") return T;
  let a = T.trim();
  if (R.skipLike !== void 0 && R.skipLike.test(a)) return T;else if (T === "0") return 0;else if (R.hex && ow0.test(a)) return mw0(a, 16);else if (a.search(/.+[eE].+/) !== -1) return _w0(T, a, R);else {
    let e = nw0.exec(a);
    if (e) {
      let t = e[1] || "",
        r = e[2],
        h = bw0(e[3]),
        i = t ? T[r.length + 1] === "." : T[r.length] === ".";
      if (!R.leadingZeros && (r.length > 1 || r.length === 1 && !i)) return T;else {
        let c = Number(a),
          s = String(c);
        if (c === 0) return c;
        if (s.search(/[eE]/) !== -1) {
          if (R.eNotation) return c;else return T;
        } else if (a.indexOf(".") !== -1) if (s === "0") return c;else if (s === h) return c;else if (s === `${t}${h}`) return c;else return T;
        let A = r ? h : a;
        if (r) return A === s || t + A === s ? c : T;else return A === s || A === t + s ? c : T;
      }
    } else return T;
  }
}