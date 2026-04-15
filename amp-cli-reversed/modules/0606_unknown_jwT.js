function gwT(T) {
  return T.replace(/^[^/]+\//, "");
}
function XfR(T) {
  return gwT(T) === EwT;
}
function $wT(T, R) {
  let a = vwT(T);
  if (!a) return;
  if (XfR(T) || R?.enableLargeContext && tp(T) === xO) return CwT;
  return a.contextWindow;
}
function tp(T) {
  let R = gwT(T);
  if (R === EwT) return xO;
  return R;
}
function x8T(T, R) {
  return T === "large" && tp(R) === xO;
}
function YfR(T) {
  let R = `anthropic/${tp(T)}`,
    a = R.split("/");
  if (a.length === 2 && a[0] === "anthropic" && a[1]) return R;
  return null;
}
function vwT(T) {
  let R = YfR(T);
  if (!R) return;
  try {
    return dn(R);
  } catch {
    return;
  }
}
function TU(T, R) {
  let a = vwT(T);
  if (!a) return Ys(`anthropic/${tp(T)}`);
  return ($wT(T, R) ?? a.contextWindow) - a.maxOutputTokens;
}
function uK(T, R) {
  let a = $wT(T, R);
  return tp(T) === xO && a !== void 0 && a < CwT;
}
function jwT(T) {
  let R = T.findLast(r => r.role === "user");
  if (!R || !Array.isArray(R.content)) return c5;
  let a = R.content.filter(r => r.type === "text").map(r => r.text).join(" ").toLowerCase(),
    e = [/\bthink harder\b/, /\bthink intensely\b/, /\bthink longer\b/, /\bthink really hard\b/, /\bthink super hard\b/, /\bthink very hard\b/],
    t = [/\bthink about it\b/, /\bthink a lot\b/, /\bthink deeply\b/, /\bthink hard\b/, /\bthink more\b/];
  for (let r of e) if (r.test(a)) return 31999;
  for (let r of t) if (r.test(a)) return 1e4;
  if (/\bthink\b/.test(a)) return c5;
  return c5;
}