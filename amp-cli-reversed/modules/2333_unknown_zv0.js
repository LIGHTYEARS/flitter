function zv0(T, R) {
  let a = -1,
    e = [],
    t;
  while (++a < T.length) {
    let r = T[a],
      h;
    if (typeof r === "string") h = r;else switch (r) {
      case -5:
        {
          h = "\r";
          break;
        }
      case -4:
        {
          h = `
`;
          break;
        }
      case -3:
        {
          h = `\r
`;
          break;
        }
      case -2:
        {
          h = R ? " " : "\t";
          break;
        }
      case -1:
        {
          if (!R && t) continue;
          h = " ";
          break;
        }
      default:
        h = String.fromCharCode(r);
    }
    t = r === -2, e.push(h);
  }
  return e.join("");
}