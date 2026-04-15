function tlR(T) {
  let R = "";
  for (let a of T) switch (a.type) {
    case "string":
      R += '"' + a.value + '"';
      break;
    default:
      R += a.value;
      break;
  }
  return R;
}
function j2(T) {
  let R = tlR(elR(uy(alR(T))));
  return JSON.parse(R);
}
function rlR(T) {
  try {
    let R = j2(T);
    if (R !== null && typeof R === "object" && !Array.isArray(R)) return R;
    return {};
  } catch {
    return {};
  }
}
function _ET(T, R, a = "...") {
  if (T.length <= R) return T;
  return T.slice(0, Math.max(0, R - a.length)) + a;
}
function hlR(T) {
  let R = T.match(/^(?:cat\s+)?<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*$/);
  if (R) return R[2];
  return T;
}
function ilR(T, R) {
  let a = T[R];
  if (!a) return null;
  let e = a.match(/^\*\*\* Add File: (.+)$/);
  if (e) return {
    filePath: e[1],
    nextIdx: R + 1
  };
  let t = a.match(/^\*\*\* Delete File: (.+)$/);
  if (t) return {
    filePath: t[1],
    nextIdx: R + 1
  };
  let r = a.match(/^\*\*\* Update File: (.+)$/);
  if (r) {
    let h,
      i = R + 1,
      c = T[i];
    if (c) {
      let s = c.match(/^\*\*\* Move to: (.+)$/);
      if (s) h = s[1], i++;
    }
    return {
      filePath: r[1],
      movePath: h,
      nextIdx: i
    };
  }
  return null;
}