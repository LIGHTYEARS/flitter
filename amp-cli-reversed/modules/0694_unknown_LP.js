function LP(T) {
  let R = {},
    a = ["items"],
    e = ["anyOf"],
    t = ["properties"];
  if (T.type && T.anyOf) throw Error("type and anyOf cannot be both populated.");
  let r = T.anyOf;
  if (r != null && r.length == 2) {
    if (r[0].type === "null") R.nullable = !0, T = r[1];else if (r[1].type === "null") R.nullable = !0, T = r[0];
  }
  if (T.type instanceof Array) _$R(T.type, R);
  for (let [h, i] of Object.entries(T)) {
    if (i == null) continue;
    if (h == "type") {
      if (i === "null") throw Error("type: null can not be the only possible type for the field.");
      if (i instanceof Array) continue;
      R.type = Object.values(Pr).includes(i.toUpperCase()) ? i.toUpperCase() : Pr.TYPE_UNSPECIFIED;
    } else if (a.includes(h)) R[h] = LP(i);else if (e.includes(h)) {
      let c = [];
      for (let s of i) {
        if (s.type == "null") {
          R.nullable = !0;
          continue;
        }
        c.push(LP(s));
      }
      R[h] = c;
    } else if (t.includes(h)) {
      let c = {};
      for (let [s, A] of Object.entries(i)) c[s] = LP(A);
      R[h] = c;
    } else {
      if (h === "additionalProperties") continue;
      R[h] = i;
    }
  }
  return R;
}