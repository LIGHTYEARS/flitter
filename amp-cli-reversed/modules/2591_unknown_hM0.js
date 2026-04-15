function hM0(T) {
  if (!T.properties || Object.keys(T.properties).length === 0) return "(no parameters)";
  return Object.keys(T.properties).map(R => {
    let a = T.properties ? T.properties[R] : void 0;
    return mQ(R, a);
  }).filter(R => R !== null).map(R => mJT(R, 0)).join(`
`);
}