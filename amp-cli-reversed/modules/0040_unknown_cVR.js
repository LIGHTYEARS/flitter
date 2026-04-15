function cVR(T, R) {
  if (R === "utf-16le") {
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T.charCodeAt(e);
      a.push(t & 255, t >> 8 & 255);
    }
    return a;
  }
  if (R === "utf-16be") {
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T.charCodeAt(e);
      a.push(t >> 8 & 255, t & 255);
    }
    return a;
  }
  return [...T].map(a => a.charCodeAt(0));
}