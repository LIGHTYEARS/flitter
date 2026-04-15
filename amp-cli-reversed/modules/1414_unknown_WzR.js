function HzR(T) {
  let R = T.replace(/\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, "");
  return NzR(R);
}
function WzR() {
  let T = new BzR("utf8"),
    R = "",
    a = Zj * 2;
  return {
    append(e) {
      if (R += T.write(e), R.length > a) R = R.slice(-a);
    },
    finish() {
      return R += T.end(), UzR(HzR(R));
    }
  };
}