function aGR(T) {
  if (typeof T !== "object" || T === null) throw Error("args must be an object. received instead: `" + JSON.stringify(T) + "`");
  if (typeof T.path !== "string") throw Error("path must be a string. received instead: `" + JSON.stringify(T.path) + "`");
}