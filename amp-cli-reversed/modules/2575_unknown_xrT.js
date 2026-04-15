function xrT(T, R) {
  let {
      colors: a,
      dim: e
    } = R,
    t = [];
  if (T.totalCostUSD === null) return t;
  let r = T.costBreakdown,
    h = r?.freeUSD ?? 0,
    i = r?.paidUSD ?? 0;
  if (h === 0 && i === 0) return t;
  let c = {
    decimalPlaces: "more-if-tiny",
    intent: "cost"
  };
  if (i === 0) t.push(new G(AP(h, c), new cT({
    color: a.foreground,
    dim: e
  }))), t.push(new G(" (free)", new cT({
    color: a.foreground,
    dim: e
  })));else if (h > 0) t.push(new G(AP(h, c), new cT({
    color: a.foreground,
    dim: e
  }))), t.push(new G(" (free)", new cT({
    color: a.foreground,
    dim: e
  }))), t.push(new G(" + ", new cT({
    color: a.foreground,
    dim: e
  }))), t.push(new G(AP(i, c), new cT({
    color: a.foreground,
    dim: e,
    bold: !e
  })));else t.push(new G(AP(i, c), new cT({
    color: a.foreground,
    dim: e,
    bold: !e
  })));
  return t;
}