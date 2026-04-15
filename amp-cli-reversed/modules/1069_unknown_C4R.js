async function* C4R(T, R = 120000) {
  let a = T[Symbol.asyncIterator]();
  while (!0) {
    let e = null;
    try {
      let t = new Promise((h, i) => {
          e = setTimeout(() => {
            i(new I3T(R));
          }, R);
        }),
        r = await Promise.race([a.next(), t]);
      if (r.done) return;
      yield r.value;
    } finally {
      if (e !== null) clearTimeout(e), e = null;
    }
  }
}