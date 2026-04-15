function IkR(T) {
  return T.map(R => {
    let a = zR.parse(R.uri);
    return `# AGENTS.md instructions for ${MR.dirname(a).fsPath}

<INSTRUCTIONS>
${R.content}
</INSTRUCTIONS>`;
  }).join(`

`);
}
async function fm(T, R, a, e, t, r) {
  let h = e ? fkR(e) : new Set();
  if (t) for (let s of t) h.add(s);
  let i = [],
    c = MR.dirname(R);
  while (a && MR.hasPrefix(c, a) && !MR.equalURIs(a, c)) {
    r?.throwIfAborted();
    for (let A of SP) {
      let l = MR.joinPath(c, A),
        o = d0(l);
      if (h.has(o) || t?.has(o)) break;
      try {
        await T.stat(l, {
          signal: r
        });
        let n = await T.readFile(l, {
            signal: r
          }),
          p = n.split(`
`).length;
        if (!t?.has(o)) {
          t?.add(o), h.add(o);
          let _ = {
            uri: o,
            lineCount: p,
            content: n
          };
          i.push(_);
        }
        break;
      } catch {}
    }
    let s = MR.dirname(c);
    if (MR.equalURIs(s, c)) break;
    c = s;
  }
  return i;
}