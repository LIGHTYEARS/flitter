function ZF(T, R, a) {
  return new xT({
    text: new G(`${T}${R}`, new cT({
      color: a
    })),
    maxLines: 1
  });
}
function ZTR(T, R, a, e) {
  return [ZF("+", T, e.success), y3.horizontal(1), ZF("~", R, e.warning), y3.horizontal(1), ZF("-", a, e.destructive)];
}
function wN0(T) {
  return !!T && typeof T === "object" && "usesDtw" in T;
}
function BN0(T) {
  if (!T || !wN0(T.meta)) return !1;
  return T.meta.usesDtw === !0;
}
function NN0(T, R) {
  try {
    return decodeURIComponent(T);
  } catch (a) {
    if (R !== void 0) return R;
    throw a;
  }
}
function WN0(T) {
  if (T.length === 0) return !1;
  let R = 0,
    a = 0,
    e = 0;
  for (let t of T) switch (t.status.type) {
    case "connected":
      R++;
      break;
    case "connecting":
    case "authenticating":
      e++;
      break;
    case "failed":
    case "denied":
    case "awaiting-approval":
    case "blocked-by-registry":
      a++;
      break;
  }
  return !(e === 0 && a === 0);
}