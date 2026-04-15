function Wx0(T) {
  let R = "result" in T && ye(T.result) ? T.result : void 0,
    a = LH("progress" in T ? T.progress : void 0),
    e = ye(a) ? a : void 0;
  return {
    main: (ye(R?.main) ? R.main : void 0) ?? (ye(e?.main) ? e.main : void 0),
    checks: (ye(R?.checks) ? R.checks : void 0) ?? (ye(e?.checks) ? e.checks : void 0)
  };
}