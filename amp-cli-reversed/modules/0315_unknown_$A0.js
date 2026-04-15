async function $A0() {
  let T = QKT.createInterface({
      input: process.stdin
    }),
    R = {};
  try {
    for await (let a of T) {
      if (a === "") break;
      let e = a.indexOf("=");
      if (e !== -1) {
        let t = a.slice(0, e),
          r = a.slice(e + 1);
        R[t] = r;
      }
    }
  } finally {
    T.close();
  }
  return R;
}