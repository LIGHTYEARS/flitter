function Dy0() {
  let T = vH.prototype;
  if (!T.hitTest) T.hitTest = function (R, a, e = 0, t = 0) {
    if ("size" in this && "offset" in this) {
      let h = this,
        i = h.size,
        c = h.offset;
      if (i && c) {
        let s = e + c.x,
          A = t + c.y,
          l = a.x >= s && a.x < s + i.width,
          o = a.y >= A && a.y < A + i.height;
        if (l && o) {
          let n = {
            x: a.x - s,
            y: a.y - A
          };
          R.add({
            target: this,
            localPosition: n
          });
          let p = this.children,
            _ = !0;
          for (let m = p.length - 1; m >= 0; m--) if (p[m].hitTest(R, a, s, A)) _ = !0;
          return _;
        }
        if (this.allowHitTestOutsideBounds) {
          let n = !1,
            p = this.children;
          for (let _ = p.length - 1; _ >= 0; _--) if (p[_].hitTest(R, a, s, A)) n = !0;
          return n;
        }
        return !1;
      }
    }
    let r = !1;
    for (let h of this.children) if (h.hitTest(R, a, e, t)) r = !0;
    return r;
  };
}