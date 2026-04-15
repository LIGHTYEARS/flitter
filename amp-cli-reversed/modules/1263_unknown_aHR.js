function ew(T, R) {
  return `\r
`.indexOf(T.charAt(R)) !== -1;
}
function aHR(T, R = [], a = Qj.DEFAULT) {
  let e = null,
    t = [],
    r = [];
  function h(i) {
    if (Array.isArray(t)) t.push(i);else if (e !== null) t[e] = i;
  }
  return S5T(T, {
    onObjectBegin: () => {
      let i = {};
      h(i), r.push(t), t = i, e = null;
    },
    onObjectProperty: i => {
      e = i;
    },
    onObjectEnd: () => {
      t = r.pop();
    },
    onArrayBegin: () => {
      let i = [];
      h(i), r.push(t), t = i, e = null;
    },
    onArrayEnd: () => {
      t = r.pop();
    },
    onLiteralValue: h,
    onError: (i, c, s) => {
      R.push({
        error: i,
        offset: c,
        length: s
      });
    }
  }, a), t[0];
}