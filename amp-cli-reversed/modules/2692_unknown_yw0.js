function yw0(T) {
  let R = Object.keys(T);
  for (let a = 0; a < R.length; a++) {
    let e = R[a];
    this.lastEntities[e] = {
      regex: new RegExp("&" + e + ";", "g"),
      val: T[e]
    };
  }
}