function HO(T, R) {
  return (R === void 0 || R === huT.platform ? huT : new IaT(R)).parseShellCommand(T);
}
function W5T(T) {
  let R = [],
    a = [...T];
  while (a.length > 0) {
    let e = a.shift(),
      t = [],
      r;
    if (typeof e.program.value === "object") {
      if (e.program.value.type === "invocations") a.push(...e.program.value.trees);
      r = xs;
    } else r = e.program.value;
    for (let h of e.arguments) if (h.value === xs || typeof h.value === "string") t.push(h.value);else if (h.value.type === "invocations") a.push(...h.value.trees), t.push(xs);else for (let i of h.value.values) if (typeof i === "object" && i.type === "invocations") a.push(...i.trees), t.push(xs);else if (i === xs || typeof i === "string") t.push(i);else throw Error("Unexpected word value: " + i);
    R.push({
      program: r,
      arguments: t
    });
  }
  return R;
}