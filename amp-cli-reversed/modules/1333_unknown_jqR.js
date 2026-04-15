function jqR(T) {
  if (T.length > PuT) throw new Ac(`Too many files: ${T.length} (max ${PuT})`);
  for (let a of T) if (a.size > kuT) throw new Ac(`File too large: ${a.path} (${Math.round(a.size / 1024)}KB, max ${kuT / 1024}KB)`);
  let R = T.reduce((a, e) => a + e.size, 0);
  if (R > xuT) throw new Ac(`Total size too large: ${Math.round(R / 1024)}KB (max ${xuT / 1024}KB)`);
}