function P40(T, R) {
  if (R === "execute") return T.lastExecuteThreadId ?? T.lastThreadId;
  return T.lastThreadId;
}
function k40(T, R, a) {
  if (a === "execute") return {
    ...T,
    lastExecuteThreadId: R
  };
  return {
    ...T,
    lastThreadId: R
  };
}
function yrT(T = {}) {
  let R = T.fs ?? He,
    a = T.dataDir ?? RN;
  return u40(R, zR.file(a));
}
async function PrT(T = {}) {
  let R = T.dataDir || T.fs ? yrT(T) : JZT;
  try {
    let a = await R.get("session");
    return {
      ...Jk,
      ...(a ?? {})
    };
  } catch {
    return {
      ...Jk
    };
  }
}