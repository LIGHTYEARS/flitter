function RHR(T, R) {
  for (let a = 0; a < R.length; a++) {
    let e = R.charAt(a);
    if (e === "\r") {
      if (a + 1 < R.length && R.charAt(a + 1) === `
`) return `\r
`;
      return "\r";
    } else if (e === `
`) return `
`;
  }
  return T && T.eol || `
`;
}