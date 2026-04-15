async function vz0(T) {
  return $z0(T).map(R => {
    let a = R.content.map(e => {
      switch (e.type) {
        case "amount":
        case "paid":
          return oR.bold.green(e.text);
        case "url":
          return oR.dim(" - ") + oR.blue.underline(e.text);
        default:
          return oR.dim(e.text);
      }
    }).join("");
    if (R.label) return oR.bold(R.label) + a;
    return a;
  }).join(`
`);
}