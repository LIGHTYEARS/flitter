function kPR(T) {
  let R = T.command.toLowerCase(),
    a = R.split("/").pop() ?? R;
  if (!T.args?.length) return null;
  let e = uDT[a];
  if (e) {
    let r = T.args[0];
    if (r && e[r]) {
      let h = e[r];
      for (let i = 1; i < T.args.length; i++) {
        let c = T.args[i];
        if (c && !c.startsWith("-")) return {
          registryType: h,
          identifier: c
        };
      }
      return null;
    }
  }
  let t = mDT[a];
  if (t) {
    for (let r of T.args) if (r && !r.startsWith("-")) return {
      registryType: t,
      identifier: r
    };
  }
  return null;
}