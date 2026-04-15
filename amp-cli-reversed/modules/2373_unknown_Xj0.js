function Xj0(T, R, a, e) {
  let t = e.join.length;
  while (t--) {
    let r = e.join[t](T, R, a, e);
    if (r === !0 || r === 1) break;
    if (typeof r === "number") return `
`.repeat(1 + r);
    if (r === !1) return `

<!---->

`;
  }
  return `

`;
}