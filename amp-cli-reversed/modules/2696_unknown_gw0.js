function gw0(T, R, a, e) {
  if (!this.options.captureMetaData) e = void 0;
  let t = this.options.updateTag(R.tagname, a, R[":@"]);
  if (t === !1) ;else if (typeof t === "string") R.tagname = t, T.addChild(R, e);else T.addChild(R, e);
}