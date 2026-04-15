function ex0(T, R) {
  if (R.startsWith("--")) {
    let a = R.slice(2);
    return T.find(e => e.long === a);
  }
  if (R.startsWith("-") && R.length === 2) {
    let a = R[1];
    return T.find(e => e.short === a);
  }
  return;
}