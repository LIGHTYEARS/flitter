function TJT(T) {
  let R = {},
    a = {};
  for (let e in T) {
    if (!Object.hasOwn(T, e)) continue;
    let t = T[e];
    switch (typeof t) {
      case "number":
        R[e] = t;
        break;
      case "boolean":
        R[e] = t ? 1 : 0;
        break;
      case "object":
        {
          if (t === null || t === void 0) {
            a[e] = t;
            break;
          }
          let {
            metadata: r
          } = TJT(t);
          for (let [h, i] of Object.entries(r)) R[`${e}.${h}`] = i;
          a[e] = t;
          break;
        }
      default:
        a[e] = t;
    }
  }
  return {
    metadata: R,
    sensitiveMetadata: a
  };
}