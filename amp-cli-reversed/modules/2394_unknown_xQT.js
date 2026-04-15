function GS0(T, R, a) {
  return R === 0 ? T : kQT(T, R, a);
}
function kQT(T, R, a) {
  return (a ? "" : "    ") + T;
}
function VS0() {
  return {
    canContainEols: ["delete"],
    enter: {
      strikethrough: YS0
    },
    exit: {
      strikethrough: QS0
    }
  };
}
function XS0() {
  return {
    unsafe: [{
      character: "~",
      inConstruct: "phrasing",
      notInConstruct: KS0
    }],
    handlers: {
      delete: xQT
    }
  };
}
function YS0(T) {
  this.enter({
    type: "delete",
    children: []
  }, T);
}
function QS0(T) {
  this.exit(T);
}
function xQT(T, R, a, e) {
  let t = a.createTracker(e),
    r = a.enter("strikethrough"),
    h = t.move("~~");
  return h += a.containerPhrasing(T, {
    ...t.current(),
    before: h,
    after: "~"
  }), h += t.move("~~"), r(), h;
}