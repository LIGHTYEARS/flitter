function n70(T, R) {
  let a = [];
  if (!T.colors) a.push("[colors]");else {
    let e = ["background", "foreground", "primary", "success", "warning", "destructive"];
    for (let t of e) if (!(t in T.colors)) a.push(`colors.${t}`);
  }
  if (a.length > 0) throw Error(`Theme "${R}" missing required fields: ${a.join(", ")}`);
}