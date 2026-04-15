function uGR(T) {
  let R = T.split("/"),
    a = [];
  for (let e of R) {
    if (e.includes("*") || e.includes("?") || e.includes("{") || e.includes("[")) break;
    a.push(e);
  }
  return a.join("/");
}