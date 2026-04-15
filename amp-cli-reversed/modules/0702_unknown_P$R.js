function P$R(T, R = {}) {
  let a = [],
    e = new Set();
  for (let t of T) {
    let r = t.name;
    if (e.has(r)) throw Error(`Duplicate function name ${r} found in MCP tools. Please ensure function names are unique.`);
    e.add(r);
    let h = y$R(t, R);
    if (h.functionDeclarations) a.push(...h.functionDeclarations);
  }
  return {
    functionDeclarations: a
  };
}