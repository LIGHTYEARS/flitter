function Td0(T, R) {
  let a = new CQT(T, R),
    e = 0;
  while (!0) {
    if (!JO0(a) && !a.hasError()) return !1;
    if (a.hasError()) break;
    e++;
  }
  return e > 0;
}
async function Rd0(T, R) {
  if (ad0(T)) {
    let a = await QO0(T);
    ed0(a);
    let e = await YO0(T, "r");
    try {
      let t = Buffer.alloc(aB + TQ),
        {
          bytesRead: r
        } = await e.read(t, 0, aB + TQ, 0);
      return iIT(t, r, R);
    } finally {
      await e.close();
    }
  } else {
    let a = R?.size !== void 0 ? R.size : T.length;
    return iIT(T, a, R);
  }
}