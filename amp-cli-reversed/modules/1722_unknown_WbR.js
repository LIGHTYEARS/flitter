function HbR(T) {
  return {
    height: T.height,
    width: T.width
  };
}
function WbR(T, R) {
  let a = R.width / R.height;
  if (T.width) return {
    height: Math.floor(T.width / a),
    width: T.width
  };
  if (T.height) return {
    height: T.height,
    width: Math.floor(T.height * a)
  };
  return {
    height: R.height,
    width: R.width
  };
}