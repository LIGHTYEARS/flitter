function QvT(T) {
  let R = [],
    a = [...T.issues].sort((e, t) => (e.path ?? []).length - (t.path ?? []).length);
  for (let e of a) if (R.push(`\u2716 ${e.message}`), e.path?.length) R.push(`  \u2192 at ${YvT(e.path)}`);
  return R.join(`
`);
}