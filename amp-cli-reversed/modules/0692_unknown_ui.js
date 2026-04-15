function ui(T) {
  if (T === null || T === void 0 || Array.isArray(T) && T.length === 0) throw Error("contents are required");
  if (!Array.isArray(T)) {
    if (HAT(T) || WAT(T)) throw Error("To specify functionCall or functionResponse parts, please wrap them in a Content object, specifying the role for them");
    return [it(T)];
  }
  let R = [],
    a = [],
    e = dK(T[0]);
  for (let t of T) {
    let r = dK(t);
    if (r != e) throw Error("Mixing Content and Parts is not supported, please group the parts into a the appropriate Content objects and specify the roles for them");
    if (r) R.push(t);else if (HAT(t) || WAT(t)) throw Error("To specify functionCall or functionResponse parts, please wrap them, and any other parts, in Content objects as appropriate, specifying the role for them");else a.push(t);
  }
  if (!e) R.push({
    role: "user",
    parts: XBT(a)
  });
  return R;
}