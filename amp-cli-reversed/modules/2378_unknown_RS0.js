function RS0(T, R) {
  let a = R || {},
    e = {
      associationId: Fj0,
      containerPhrasing: rS0,
      containerFlow: hS0,
      createTracker: TS0,
      compilePattern: Gj0,
      enter: r,
      handlers: {
        ...hrT
      },
      handle: void 0,
      indentLines: Qj0,
      indexStack: [],
      join: [...Wj0],
      options: {},
      safe: iS0,
      stack: [],
      unsafe: [...zj0]
    };
  if (tQT(e, a), e.options.tightDefinitions) e.join.push(tS0);
  e.handle = Tj0("type", {
    invalid: aS0,
    unknown: eS0,
    handlers: e.handlers
  });
  let t = e.handle(T, void 0, e, {
    before: `
`,
    after: `
`,
    now: {
      line: 1,
      column: 1
    },
    lineShift: 0
  });
  if (t && t.charCodeAt(t.length - 1) !== 10 && t.charCodeAt(t.length - 1) !== 13) t += `
`;
  return t;
  function r(h) {
    return e.stack.push(h), i;
    function i() {
      e.stack.pop();
    }
  }
}