function elR(T) {
  let R = [];
  for (let a of T) {
    if (a.type === "brace") if (a.value === "{") R.push("}");else {
      let e = R.lastIndexOf("}");
      if (e !== -1) R.splice(e, 1);
    }
    if (a.type === "paren") if (a.value === "[") R.push("]");else {
      let e = R.lastIndexOf("]");
      if (e !== -1) R.splice(e, 1);
    }
  }
  if (R.length > 0) {
    R.reverse();
    for (let a of R) if (a === "}") T.push({
      type: "brace",
      value: "}"
    });else if (a === "]") T.push({
      type: "paren",
      value: "]"
    });
  }
  return T;
}