async function yAR(T, R, a) {
  let e = a.get(T) ?? a.get(decodeURIComponent(T)) ?? a.get(encodeURI(T));
  if (!e) return;
  let t = (e[String(R)] ?? Object.values(e)[0])?.cursorState?.[0];
  if (!t) return;
  let r = await PAR(T);
  if (r === void 0) return;
  let h = MiT(t.selectionStart.lineNumber, t.selectionStart.column),
    i = MiT(t.position.lineNumber, t.position.column),
    c = DiT(h, i) <= 0 ? h : i,
    s = DiT(h, i) <= 0 ? i : h,
    A = c.line === s.line && c.character === s.character ? kAR(r, c.line) : xAR(r, c.line, c.character, s.line, s.character);
  return {
    range: {
      startLine: c.line,
      startCharacter: c.character,
      endLine: s.line,
      endCharacter: s.character
    },
    content: A
  };
}