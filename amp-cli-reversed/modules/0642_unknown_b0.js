function b0(T, R) {
  let a = /\{([^}]+)\}/g;
  return T.replace(a, (e, t) => {
    if (Object.prototype.hasOwnProperty.call(R, t)) {
      let r = R[t];
      return r !== void 0 && r !== null ? String(r) : "";
    } else throw Error(`Key '${t}' not found in valueMap.`);
  });
}