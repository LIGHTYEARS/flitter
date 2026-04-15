function sIT(T) {
  return T.replace(/\s+at line \d+,/, " at");
}
async function DQT(T) {
  let R = T.split(`
`),
    a = T.trim();
  if (!a) return {
    success: !0,
    entries: []
  };
  let e = mLT(a);
  if (e.success) {
    let t = fj(e.data);
    if (t.success) return {
      success: !0,
      entries: t.data
    };else {
      let r = [...R],
        h = 0;
      for (let i of t.error.issues) {
        let c = parseInt(i.path[0], 10);
        if (!isNaN(c)) {
          let s = 0,
            A = 0;
          for (let o = 0; o < r.length; o++) {
            let n = r[o + h];
            if (n && !n.trim().startsWith("#") && n.trim() !== "") {
              if (A === c) {
                s = o + h;
                break;
              }
              A++;
            }
          }
          let l = `# Error: ${sIT(i.message)}`;
          r.splice(s + h, 0, l), h++;
        }
      }
      return {
        success: !1,
        contentWithErrors: r.join(`
`)
      };
    }
  } else {
    let t = [...R],
      r = e.error,
      h = Math.max(0, r.line - 1),
      i = `# Error: ${sIT(r.message)}`;
    return t.splice(h, 0, i), {
      success: !1,
      contentWithErrors: t.join(`
`)
    };
  }
}