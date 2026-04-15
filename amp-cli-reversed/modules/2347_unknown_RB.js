function LA(T) {
  return "&#x" + T.toString(16).toUpperCase() + ";";
}
function RB(T, R, a) {
  let e = Zk(T),
    t = Zk(R);
  if (e === void 0) return t === void 0 ? a === "_" ? {
    inside: !0,
    outside: !0
  } : {
    inside: !1,
    outside: !1
  } : t === 1 ? {
    inside: !0,
    outside: !0
  } : {
    inside: !1,
    outside: !0
  };
  if (e === 1) return t === void 0 ? {
    inside: !1,
    outside: !1
  } : t === 1 ? {
    inside: !0,
    outside: !0
  } : {
    inside: !1,
    outside: !1
  };
  return t === void 0 ? {
    inside: !1,
    outside: !1
  } : t === 1 ? {
    inside: !0,
    outside: !1
  } : {
    inside: !1,
    outside: !1
  };
}