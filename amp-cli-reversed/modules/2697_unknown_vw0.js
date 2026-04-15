function vw0(T, R, a, e) {
  if (T) {
    if (e === void 0) e = R.child.length === 0;
    if (T = this.parseTextData(T, R.tagname, a, !1, R[":@"] ? Object.keys(R[":@"]).length !== 0 : !1, e), T !== void 0 && T !== "") R.add(this.options.textNodeName, T);
    T = "";
  }
  return T;
}