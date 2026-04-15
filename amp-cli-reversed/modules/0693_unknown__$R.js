function _$R(T, R) {
  if (T.includes("null")) R.nullable = !0;
  let a = T.filter(e => e !== "null");
  if (a.length === 1) R.type = Object.values(Pr).includes(a[0].toUpperCase()) ? a[0].toUpperCase() : Pr.TYPE_UNSPECIFIED;else {
    R.anyOf = [];
    for (let e of a) R.anyOf.push({
      type: Object.values(Pr).includes(e.toUpperCase()) ? e.toUpperCase() : Pr.TYPE_UNSPECIFIED
    });
  }
}