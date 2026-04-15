function a1T(T) {
  let R = T.text?.replace(/\r/g, ""),
    a = T.children?.map(e => a1T(e));
  return new G(R, T.style, a, T.hyperlink, T.onClick);
}
class p8 {
  color;
  border;
  constructor(T, R) {
    this.color = T, this.border = R;
  }
}