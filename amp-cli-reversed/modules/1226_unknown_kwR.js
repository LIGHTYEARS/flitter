function kwR(T) {
  let R = ywR(T);
  if (R.length === 0) return [];
  return [{
    type: "text",
    text: ["# Workspace Projects", ...R.map(a => {
      let e = PwR(a.repositoryURL),
        t = e === a.repositoryURL ? e : `${e} (${a.repositoryURL})`;
      return `- ${a.name}: ${t}`;
    })].join(`
`)
  }];
}