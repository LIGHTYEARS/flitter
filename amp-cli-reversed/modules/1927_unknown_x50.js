function x50(T, R = {}) {
  let a = {
    useAscii: R.useAscii ?? !1,
    paddingX: R.paddingX ?? 5,
    paddingY: R.paddingY ?? 5,
    boxBorderPadding: R.boxBorderPadding ?? 1,
    graphDirection: "TD"
  };
  switch (k50(T)) {
    case "sequence":
      return c50(T, a);
    case "class":
      return p50(T, a);
    case "er":
      return P50(T, a);
    case "flowchart":
    default:
      {
        let e = cq0(T);
        if (e.direction === "LR" || e.direction === "RL") a.graphDirection = "LR";else a.graphDirection = "TD";
        let t = $q0(e, a);
        if (r50(t), Qq0(t), e.direction === "BT") fq0(t.canvas);
        return fW(t.canvas);
      }
  }
}