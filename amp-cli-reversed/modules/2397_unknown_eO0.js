function eO0(T) {
  let R = T._align;
  Ue(R, "expected `_align` on table"), this.enter({
    type: "table",
    align: R.map(function (a) {
      return a === "none" ? null : a;
    }),
    children: []
  }, T), this.data.inTable = !0;
}