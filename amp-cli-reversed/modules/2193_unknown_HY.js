function HY(T, R) {
  if (R === null || R === void 0) ;else if (typeof R === "number" || typeof R === "string") T.push({
    type: "text",
    value: String(R)
  });else if (Array.isArray(R)) for (let a of R) HY(T, a);else if (typeof R === "object" && "type" in R) {
    if (R.type === "root") HY(T, R.children);else T.push(R);
  } else throw Error("Expected node, nodes, or string, got `" + R + "`");
}