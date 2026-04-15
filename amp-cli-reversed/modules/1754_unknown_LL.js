function LL(T, R) {
  if (!T || R === null || typeof R !== "object") return;
  if (T.type === "object" && T.properties && typeof T.properties === "object") {
    let a = R,
      e = T.properties;
    for (let t of Object.keys(e)) {
      let r = e[t];
      if (a[t] === void 0 && Object.prototype.hasOwnProperty.call(r, "default")) a[t] = r.default;
      if (a[t] !== void 0) LL(r, a[t]);
    }
  }
  if (Array.isArray(T.anyOf)) {
    for (let a of T.anyOf) if (typeof a !== "boolean") LL(a, R);
  }
  if (Array.isArray(T.oneOf)) {
    for (let a of T.oneOf) if (typeof a !== "boolean") LL(a, R);
  }
}