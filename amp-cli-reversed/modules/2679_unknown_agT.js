function RgT(T) {
  return T === " " || T === "\t" || T === `
` || T === "\r";
}
function agT(T, R) {
  let a = R;
  for (; R < T.length; R++) if (T[R] == "?" || T[R] == " ") {
    let e = T.substr(a, R - a);
    if (R > 5 && e === "xml") return ma("InvalidXml", "XML declaration allowed only at the start of the document.", ft(T, R));else if (T[R] == "?" && T[R + 1] == ">") {
      R++;
      break;
    } else continue;
  }
  return R;
}