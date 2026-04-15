function RTR(T) {
  let R = "",
    a = new TTR(T, e => R += j70(e));
  return function (e, t) {
    let r = 0,
      h = 0;
    while ((h = e.indexOf("&", h)) >= 0) {
      R += e.slice(r, h), a.startEntity(t);
      let c = a.write(e, h + 1);
      if (c < 0) {
        r = h + a.end();
        break;
      }
      r = h + c, h = c === 0 ? r + 1 : r;
    }
    let i = R + e.slice(r);
    return R = "", i;
  };
}