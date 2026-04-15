function kHR(T) {
  return bHR.has(T.toLowerCase());
}
function HI(T, R, a, e) {
  T.writeHead(R, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": uHR
  });
  let t = yHR.replaceAll("{{title}}", TuT(a)).replaceAll("{{message}}", TuT(e));
  T.end(t);
}