function a$T(T) {
  let R = [],
    a = /(\+?\$[\d,.]+(?:\/\$[\d,.]+)?(?:\/hour)?)|(\busage paid\b|\bpaid\b)|(\s-\s(?=https?:\/\/))|((https?:\/\/)[^\s]+)|([^$\s][^\s]*)/gi,
    e,
    t = 0;
  while ((e = a.exec(T)) !== null) {
    if (e.index > t) {
      let A = T.slice(t, e.index);
      if (A) R.push({
        type: "text",
        text: A
      });
    }
    let [r, h, i, c, s] = e;
    if (h) R.push({
      type: "amount",
      text: h
    });else if (i) R.push({
      type: "paid",
      text: i
    });else if (c) ;else if (s) R.push({
      type: "url",
      text: s
    });else {
      let A = r.replace(/\s+\)/g, ")");
      R.push({
        type: "text",
        text: A
      });
    }
    t = a.lastIndex;
  }
  if (t < T.length) {
    let r = T.slice(t);
    if (r) R.push({
      type: "text",
      text: r
    });
  }
  return R;
}