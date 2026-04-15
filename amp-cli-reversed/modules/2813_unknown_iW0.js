function iW0(T) {
  let R = T.reduce((a, e) => {
    return (a[e.name] ??= []).push(e), a;
  }, {});
  return Object.entries(R).map(([a, e]) => ({
    name: a,
    versions: e.map(t => t.version).sort()
  }));
}