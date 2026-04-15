function fdR(T) {
  let R;
  if (!T) return R = {
    scopes: [fI]
  }, R;else {
    if (R = T, !R.scopes) return R.scopes = [fI], R;else if (typeof R.scopes === "string" && R.scopes !== fI || Array.isArray(R.scopes) && R.scopes.indexOf(fI) < 0) throw Error(`Invalid auth scopes. Scopes must include: ${fI}`);
    return R;
  }
}