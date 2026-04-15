function ms(T, R) {
  if (T === "Read") {
    let t = $x0(R);
    if (t) return t;
  }
  if (T === "file_tree") return vx0(R);
  if (T === "web_search") {
    let t = w1T(R);
    return t ? `Web Search ${t}` : "Web Search";
  }
  if (T === "read_web_page") {
    let t = D1T(R);
    return t ? `Read ${t}` : "Read";
  }
  if (T.toLowerCase() === "Grep".toLowerCase()) return Sx0(R);
  let a = ai(R);
  if (!a) return T;
  let e = a.includes("/") ? qA(a) : a;
  return `${T} ${e}`;
}