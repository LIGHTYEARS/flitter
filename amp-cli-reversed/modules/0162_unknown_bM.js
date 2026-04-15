function fz(T) {
  if (T instanceof n00) return !0;
  let R = T[Symbol.toStringTag];
  return R === "Blob" || R === "File";
}
function bM(T, R) {
  switch (typeof T) {
    case "string":
      if (T.length > 3) {
        if (R.objectMap[T] > -1 || R.values.length >= R.maxValues) return;
        let e = R.get(T);
        if (e) {
          if (++e.count == 2) R.values.push(T);
        } else if (R.set(T, {
          count: 1
        }), R.samplingPackedValues) {
          let t = R.samplingPackedValues.get(T);
          if (t) t.count++;else R.samplingPackedValues.set(T, {
            count: 1
          });
        }
      }
      break;
    case "object":
      if (T) if (T instanceof Array) for (let e = 0, t = T.length; e < t; e++) bM(T[e], R);else {
        let e = !R.encoder.useRecords;
        for (var a in T) if (T.hasOwnProperty(a)) {
          if (e) bM(a, R);
          bM(T[a], R);
        }
      }
      break;
    case "function":
      console.log(T);
  }
}