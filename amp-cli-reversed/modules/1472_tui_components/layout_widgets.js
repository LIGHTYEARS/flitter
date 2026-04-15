r1T = class r1T extends O9 {
  _clipBehavior;
  constructor(T) {
    super();
    this._clipBehavior = T;
  }
  updateClipBehavior(T) {
    if (this._clipBehavior !== T) this._clipBehavior = T, this.markNeedsPaint();
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight), super.performLayout();
      return;
    }
    let R = this.children[0];
    R.layout(T), this.setSize(R.size.width, R.size.height), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    if (this.children.length === 0 || this._clipBehavior === "none") {
      super.paint(T, R, a);
      return;
    }
    let e = this.children[0],
      t = R + this.offset.x,
      r = a + this.offset.y,
      h = this.size.width,
      i = this.size.height,
      c = new zm(T, t, r, h, i);
    e.paint(c, R + this.offset.x, a + this.offset.y);
  }
};
SR = class SR extends _t {
  width;
  height;
  padding;
  margin;
  decoration;
  constraints;
  constructor({
    key: T,
    child: R,
    width: a,
    height: e,
    padding: t,
    margin: r,
    decoration: h,
    constraints: i
  } = {}) {
    super({
      ...(T ? {
        key: T
      } : {}),
      ...(R ? {
        child: R
      } : {})
    });
    this.width = a, this.height = e, this.padding = t, this.margin = r, this.decoration = h, this.constraints = i;
  }
  createElement() {
    return new h1T(this);
  }
  createRenderObject() {
    return new qw(this.width, this.height, this.padding, this.margin, this.decoration, this.constraints);
  }
  updateRenderObject(T) {
    if (!(T instanceof qw)) throw Error("renderObject must be an instance of ContainerRenderObject");
    T.updateProperties(this.width, this.height, this.padding, this.margin, this.decoration, this.constraints);
  }
};
qw = class qw extends O9 {
  _width;
  _height;
  _padding;
  _margin;
  _decoration;
  _constraints;
  _forceDim = !1;
  constructor(T, R, a, e, t, r) {
    super();
    this._width = T, this._height = R, this._padding = a, this._margin = e, this._decoration = t, this._constraints = r;
  }
  setForceDim(T) {
    if (this._forceDim !== T) this._forceDim = T, this.markNeedsPaint();
  }
  updateProperties(T, R, a, e, t, r) {
    this._width = T, this._height = R, this._padding = a, this._margin = e, this._decoration = t, this._constraints = r, this.markNeedsLayout(), this.markNeedsPaint();
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this._margin?.horizontal ?? 0,
      a = this._margin?.vertical ?? 0,
      e = this._padding?.horizontal ?? 0,
      t = this._padding?.vertical ?? 0,
      r = this._decoration?.border,
      h = (r?.left ? 1 : 0) + (r?.right ? 1 : 0),
      i = (r?.top ? 1 : 0) + (r?.bottom ? 1 : 0);
    this.sendDebugData({
      margin: this._margin,
      padding: this._padding,
      decoration: this._decoration,
      width: this._width,
      height: this._height,
      constraints: this._constraints
    });
    let c = this._width !== void 0 || this._height !== void 0 ? this._constraints?.tighten({
        width: this._width,
        height: this._height
      }) ?? o0.tightFor({
        width: this._width,
        height: this._height
      }) : this._constraints,
      s = c ? T.enforce(c) : T,
      A = s.maxWidth - R - e - h,
      l = s.maxHeight - a - t - i,
      o = new o0(Math.max(0, s.minWidth - R - e - h), Math.max(0, A), Math.max(0, s.minHeight - a - t - i), Math.max(0, l)),
      n,
      p;
    if (this.children.length > 0) {
      let b = this.children[0];
      if (!(b instanceof O9)) throw Error("Child must be a RenderBox");
      b.layout(o), n = b.size.width, p = b.size.height;
      let y = r?.left ? 1 : 0,
        u = r?.top ? 1 : 0,
        P = (this._margin?.left ?? 0) + y + (this._padding?.left ?? 0),
        k = (this._margin?.top ?? 0) + u + (this._padding?.top ?? 0);
      b.setOffset(P, k);
    } else if (o.maxWidth !== 1 / 0 && o.maxHeight !== 1 / 0) n = o.maxWidth, p = o.maxHeight;else n = o.minWidth, p = o.minHeight;
    let _, m;
    if (s.minWidth === s.maxWidth && isFinite(s.maxWidth)) _ = s.maxWidth;else _ = n + e + h + R;
    if (s.minHeight === s.maxHeight && isFinite(s.maxHeight)) m = s.maxHeight;else m = p + t + i + a;
    this.setSize(s.constrain(_, m).width, s.constrain(_, m).height);
  }
  getMinIntrinsicWidth(T) {
    if (this._width !== void 0) return this._width;
    if (this._constraints && this._constraints.minWidth !== 0) return this._constraints.minWidth;
    let R = this._margin?.horizontal ?? 0,
      a = this._padding?.horizontal ?? 0,
      e = this._decoration?.border,
      t = (e?.left ? 1 : 0) + (e?.right ? 1 : 0),
      r = 0;
    if (this.children.length > 0) {
      let h = this.children[0],
        i = Math.max(0, T - (this._margin?.vertical ?? 0) - (this._padding?.vertical ?? 0) - ((e?.top ? 1 : 0) + (e?.bottom ? 1 : 0)));
      r = h.getMinIntrinsicWidth(i);
    }
    return r + R + a + t;
  }
  getMaxIntrinsicWidth(T) {
    if (this._width !== void 0) return this._width;
    if (this._constraints && this._constraints.maxWidth !== 1 / 0) return this._constraints.maxWidth;
    let R = this._margin?.horizontal ?? 0,
      a = this._padding?.horizontal ?? 0,
      e = this._decoration?.border,
      t = (e?.left ? 1 : 0) + (e?.right ? 1 : 0),
      r = 0;
    if (this.children.length > 0) {
      let h = this.children[0],
        i = Math.max(0, T - (this._margin?.vertical ?? 0) - (this._padding?.vertical ?? 0) - ((e?.top ? 1 : 0) + (e?.bottom ? 1 : 0)));
      r = h.getMaxIntrinsicWidth(i);
    }
    if (r === 1 / 0) return 1 / 0;
    return r + R + a + t;
  }
  getMinIntrinsicHeight(T) {
    if (this._height !== void 0) return this._height;
    if (this._constraints && this._constraints.minHeight !== 0) return this._constraints.minHeight;
    let R = this._margin?.vertical ?? 0,
      a = this._padding?.vertical ?? 0,
      e = this._decoration?.border,
      t = (e?.top ? 1 : 0) + (e?.bottom ? 1 : 0),
      r = 0;
    if (this.children.length > 0) {
      let i = this.children[0],
        c = Math.max(0, T - (this._margin?.horizontal ?? 0) - (this._padding?.horizontal ?? 0) - ((e?.left ? 1 : 0) + (e?.right ? 1 : 0)));
      r = i.getMinIntrinsicHeight(c);
    }
    let h = r + R + a + t;
    if (this._constraints && this._constraints.maxHeight !== 1 / 0) return Math.min(h, this._constraints.maxHeight);
    return h;
  }
  getMaxIntrinsicHeight(T) {
    if (this._height !== void 0) return this._height;
    if (this._constraints && this._constraints.maxHeight !== 1 / 0) return this._constraints.maxHeight;
    let R = this._margin?.vertical ?? 0,
      a = this._padding?.vertical ?? 0,
      e = this._decoration?.border,
      t = (e?.top ? 1 : 0) + (e?.bottom ? 1 : 0),
      r = 0;
    if (this.children.length > 0) {
      let h = this.children[0],
        i = Math.max(0, T - (this._margin?.horizontal ?? 0) - (this._padding?.horizontal ?? 0) - ((e?.left ? 1 : 0) + (e?.right ? 1 : 0)));
      r = h.getMaxIntrinsicHeight(i);
    }
    if (r === 1 / 0) return 1 / 0;
    return r + R + a + t;
  }
  paint(T, R = 0, a = 0) {
    let e = Math.floor(R + this.offset.x),
      t = Math.floor(a + this.offset.y);
    if (this._decoration?.color) {
      let r = {
        bg: this._decoration.color
      };
      T.fill(e, t, this.size.width, this.size.height, " ", r);
    }
    if (this._decoration?.border) this._paintBorder(T, e, t);
    super.paint(T, R, a);
  }
  _paintBorder(T, R, a) {
    let e = this._decoration.border,
      t = this.size.width,
      r = this.size.height,
      h = n => {
        let p = {
          fg: n
        };
        if (this._decoration?.color) p.bg = this._decoration.color;
        if (this._forceDim) p.dim = !0;
        return p;
      },
      i = n => {
        switch (n) {
          case 1:
            return "\u2500";
          case 2:
            return "\u2501";
          case 3:
            return "\u2501";
          default:
            return "\u2501";
        }
      },
      c = n => {
        switch (n) {
          case 1:
            return "\u2502";
          case 2:
            return "\u2503";
          case 3:
            return "\u2503";
          default:
            return "\u2503";
        }
      },
      s = (n, p) => {
        if (n === 1) return p ? {
          tl: "\u256D",
          tr: "\u256E",
          bl: "\u2570",
          br: "\u256F"
        } : {
          tl: "\u250C",
          tr: "\u2510",
          bl: "\u2514",
          br: "\u2518"
        };else return p ? {
          tl: "\u256D",
          tr: "\u256E",
          bl: "\u2570",
          br: "\u256F"
        } : {
          tl: "\u250F",
          tr: "\u2513",
          bl: "\u2517",
          br: "\u251B"
        };
      };
    if (e.top) {
      let n = h(e.top.color),
        p = i(e.top.width),
        _ = e.left ? 1 : 0,
        m = e.right ? t - 1 : t;
      for (let b = _; b < m; b++) T.mergeBorderChar(R + b, a, p, n);
    }
    if (e.bottom) {
      let n = h(e.bottom.color),
        p = i(e.bottom.width),
        _ = e.left ? 1 : 0,
        m = e.right ? t - 1 : t;
      for (let b = _; b < m; b++) T.mergeBorderChar(R + b, a + r - 1, p, n);
    }
    if (e.left) {
      let n = h(e.left.color),
        p = c(e.left.width),
        _ = e.top ? 1 : 0,
        m = e.bottom ? r - 1 : r;
      for (let b = _; b < m; b++) T.mergeBorderChar(R, a + b, p, n);
    }
    if (e.right) {
      let n = h(e.right.color),
        p = c(e.right.width),
        _ = e.top ? 1 : 0,
        m = e.bottom ? r - 1 : r;
      for (let b = _; b < m; b++) T.mergeBorderChar(R + t - 1, a + b, p, n);
    }
    let A = e.top?.style === "rounded",
      l = Math.max(e.top?.width ?? 1, e.right?.width ?? 1, e.bottom?.width ?? 1, e.left?.width ?? 1),
      o = s(l, A);
    if (e.top && e.left) {
      let n = h(e.top.color);
      T.mergeBorderChar(R, a, o.tl, n);
    }
    if (e.top && e.right) {
      let n = h(e.top.color);
      T.mergeBorderChar(R + t - 1, a, o.tr, n);
    }
    if (e.bottom && e.left) {
      let n = h(e.bottom.color);
      T.mergeBorderChar(R, a + r - 1, o.bl, n);
    }
    if (e.bottom && e.right) {
      let n = h(e.bottom.color);
      T.mergeBorderChar(R + t - 1, a + r - 1, o.br, n);
    }
  }
  hitTest(T, R, a = 0, e = 0) {
    return super.hitTest(T, R, a, e);
  }
  dispose() {
    this._decoration = void 0, this._constraints = void 0, this._padding = void 0, this._margin = void 0, super.dispose();
  }
};
s1T = class s1T extends O9 {
  _direction;
  _mainAxisAlignment;
  _crossAxisAlignment;
  _mainAxisSize;
  constructor(T, R, a, e) {
    super();
    this._direction = T, this._mainAxisAlignment = R, this._crossAxisAlignment = a, this._mainAxisSize = e;
  }
  updateProperties(T, R, a, e) {
    this._direction = T, this._mainAxisAlignment = R, this._crossAxisAlignment = a, this._mainAxisSize = e, this.markNeedsLayout();
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this._direction === "horizontal",
      a = [],
      e = [];
    for (let m of this.children) {
      let b = m.parentData;
      if (b && b.flex > 0) a.push({
        child: m,
        flex: b.flex,
        fit: b.fit
      });else e.push(m);
    }
    let t = 0,
      r = 0,
      h,
      i = R ? T.maxHeight : T.maxWidth;
    if (isFinite(i)) h = i;else {
      let m = 0;
      for (let b of e) {
        let y = R ? b.getMaxIntrinsicHeight(1 / 0) : b.getMaxIntrinsicWidth(1 / 0);
        m = Math.max(m, y);
      }
      h = m;
    }
    for (let m of e) {
      let b = this._crossAxisAlignment === "stretch" ? h : 0,
        y = R ? new o0(0, 1 / 0, b, h) : new o0(b, h, 0, 1 / 0);
      if (m.layout(y), R) t += m.size.width, r = Math.max(r, m.size.height);else t += m.size.height, r = Math.max(r, m.size.width);
    }
    let c = R ? T.maxWidth : T.maxHeight,
      s = Number.isFinite(c) ? Math.max(0, c - t) : 0,
      A = a.reduce((m, b) => m + b.flex, 0),
      l = c < 1 / 0;
    if (!l && A > 0) {
      for (let {
        flex: m,
        fit: b
      } of a) if (m > 0 && (this._mainAxisSize === "max" || b === "tight")) {
        let y = R ? "row" : "column",
          u = R ? "horizontal" : "vertical",
          P = R ? "width" : "height";
        e8(!1, `RenderFlex children have non-zero flex but incoming ${P} constraints are unbounded.

When a ${y} is in a parent that does not provide a finite ${P} constraint, for example if it is in a ${u} scrollable, it will try to shrink-wrap its children along the ${u} axis. Setting a flex on a child (e.g. using Expanded) indicates that the child is to expand to fill the remaining space in the ${u} direction.

These two directives are mutually exclusive. If a parent is to shrink-wrap its child, the child cannot simultaneously expand to fit its parent.

Consider setting mainAxisSize to MainAxisSize.min and using FlexFit.loose fits for the flexible children (using Flexible rather than Expanded). This will allow the flexible children to size themselves to less than the infinite remaining space they would otherwise be forced to take, and then will cause the RenderFlex to shrink-wrap the children rather than expanding to fit the maximum constraints provided by the parent.`);
      }
    }
    let o = 0;
    if (A > 0) {
      let m = s / A,
        b = 0;
      for (let y = 0; y < a.length; y++) {
        let {
            child: u,
            flex: P,
            fit: k
          } = a[y],
          x;
        if (y === a.length - 1) x = s - b;else x = Math.floor(m * P), b += x;
        let f = R ? T.maxHeight : T.maxWidth,
          v = !l,
          g = R ? k === "tight" ? new o0(x, x, 0, f) : v ? new o0(0, 1 / 0, 0, f) : o0.loose(x, f) : k === "tight" ? new o0(0, f, x, x) : v ? new o0(0, f, 0, 1 / 0) : o0.loose(f, x);
        if (u.layout(g), R) o += u.size.width, r = Math.max(r, u.size.height);else o += u.size.height, r = Math.max(r, u.size.width);
      }
    }
    let n = !l || this._mainAxisSize === "min" ? o : s,
      p = t + (A > 0 ? n : 0);
    if (R) {
      let m = this._mainAxisSize === "min" || T.maxWidth === 1 / 0 ? H4(p, T.minWidth, T.maxWidth) : Math.max(T.minWidth, T.maxWidth),
        b = H4(r, T.minHeight, T.maxHeight);
      this.setSize(N4(m, T.minWidth), N4(b, T.minHeight));
    } else {
      let m = this._mainAxisSize === "min" || T.maxHeight === 1 / 0 ? H4(p, T.minHeight, T.maxHeight) : Math.max(T.minHeight, T.maxHeight),
        b = H4(r, T.minWidth, T.maxWidth);
      this.setSize(N4(b, T.minWidth), N4(m, T.minHeight));
    }
    let _ = R ? this.size.height : this.size.width;
    this.positionChildren(R, _, T);
  }
  positionChildren(T, R, a) {
    let e = this.children;
    if (e.length === 0) return;
    let t = 0;
    for (let A of e) t += T ? A.size.width : A.size.height;
    let r = T ? this.size.width : this.size.height,
      h = Math.max(0, r - t),
      i = 0,
      c = 0;
    switch (this._mainAxisAlignment) {
      case "start":
        i = 0;
        break;
      case "end":
        i = h;
        break;
      case "center":
        i = h / 2;
        break;
      case "spaceBetween":
        c = e.length > 1 ? Math.floor(h / (e.length - 1)) : 0;
        break;
      case "spaceAround":
        c = e.length > 0 ? h / e.length : 0, i = c / 2;
        break;
      case "spaceEvenly":
        c = e.length > 0 ? Math.floor(h / (e.length + 1)) : 0, i = c;
        break;
    }
    let s = i;
    for (let A = 0; A < e.length; A++) {
      let l = e[A],
        o = T ? l.size.width : l.size.height,
        n = T ? l.size.height : l.size.width,
        p = 0;
      switch (this._crossAxisAlignment) {
        case "start":
          p = 0;
          break;
        case "end":
          p = R - n;
          break;
        case "center":
          p = (R - n) / 2;
          break;
        case "stretch":
          p = 0;
          break;
        case "baseline":
          if (!T) throw Error("CrossAxisAlignment.baseline is only supported for horizontal flex (Row)");
          p = 0;
          break;
      }
      if (T) l.setOffset(s, p);else l.setOffset(p, s);
      if (s += o, A < e.length - 1) s += c;
    }
  }
  getMinIntrinsicWidth(T) {
    let R = this._direction === "horizontal",
      a = this.children;
    if (R) {
      let e = 0,
        t = 0,
        r = 0;
      for (let h of a) {
        let i = h.parentData?.flex ?? 0;
        if (i > 0) {
          t += i;
          let c = h.getMinIntrinsicWidth(T) / i;
          r = Math.max(r, c);
        } else e += h.getMinIntrinsicWidth(T);
      }
      return e + r * t;
    } else {
      let e = 0;
      for (let t of a) e = Math.max(e, t.getMinIntrinsicWidth(T));
      return e;
    }
  }
  getMaxIntrinsicWidth(T) {
    let R = this._direction === "horizontal",
      a = this.children;
    if (R) {
      let e = 0,
        t = 0,
        r = 0;
      for (let h of a) {
        let i = h.parentData?.flex ?? 0;
        if (i > 0) {
          t += i;
          let c = h.getMaxIntrinsicWidth(T) / i;
          r = Math.max(r, c);
        } else e += h.getMaxIntrinsicWidth(T);
      }
      return e + r * t;
    } else {
      let e = 0;
      for (let t of a) e = Math.max(e, t.getMaxIntrinsicWidth(T));
      return e;
    }
  }
  getMaxIntrinsicHeight(T) {
    let R = this._direction === "horizontal",
      a = this.children;
    if (R) {
      let e = 0,
        t = 0,
        r = [],
        h = [];
      for (let s of a) {
        let A = s.parentData;
        if (A && A.flex > 0) t += A.flex, h.push({
          child: s,
          flex: A.flex
        });else r.push(s);
      }
      let i = 0;
      for (let s of r) i += s.getMaxIntrinsicWidth(0);
      let c = Math.max(0, T - i);
      for (let s of a) {
        let A = s.parentData,
          l = T;
        if (A && A.flex > 0 && t > 0) l = c / t * A.flex;
        e = Math.max(e, s.getMaxIntrinsicHeight(l));
      }
      return e;
    } else {
      let e = 0,
        t = 0,
        r = 0;
      for (let h of a) {
        let i = h.parentData?.flex ?? 0;
        if (i > 0) {
          t += i;
          let c = h.getMaxIntrinsicHeight(T) / i;
          r = Math.max(r, c);
        } else e += h.getMaxIntrinsicHeight(T);
      }
      return e + r * t;
    }
  }
  getMinIntrinsicHeight(T) {
    let R = this._direction === "horizontal",
      a = this.children;
    if (R) {
      let e = 0,
        t = 0,
        r = [],
        h = [];
      for (let s of a) {
        let A = s.parentData;
        if (A && A.flex > 0) t += A.flex, h.push(s);else r.push(s);
      }
      let i = 0;
      for (let s of r) i += s.getMinIntrinsicWidth(0);
      let c = Math.max(0, T - i);
      for (let s of a) {
        let A = s.parentData,
          l = T;
        if (A && A.flex > 0 && t > 0) l = c / t * A.flex;
        e = Math.max(e, s.getMinIntrinsicHeight(l));
      }
      return e;
    } else {
      let e = 0,
        t = 0,
        r = 0;
      for (let h of a) {
        let i = h.parentData?.flex ?? 0;
        if (i > 0) {
          t += i;
          let c = h.getMinIntrinsicHeight(T) / i;
          r = Math.max(r, c);
        } else e += h.getMinIntrinsicHeight(T);
      }
      return e + r * t;
    }
  }
  dispose() {
    this._direction = "vertical", this._mainAxisAlignment = "start", this._crossAxisAlignment = "start", this._mainAxisSize = "min", super.dispose();
  }
};
zw = class zw extends MtT {
  left;
  top;
  right;
  bottom;
  width;
  height;
  constructor(T, R, a, e, t, r) {
    super();
    this.left = T, this.top = R, this.right = a, this.bottom = e, this.width = t, this.height = r;
  }
  isPositioned() {
    return this.top !== void 0 || this.right !== void 0 || this.bottom !== void 0 || this.left !== void 0 || this.width !== void 0 || this.height !== void 0;
  }
  positionedChildConstraints(T) {
    e8(this.isPositioned(), "positionedChildConstraints called on non-positioned child");
    let R;
    if (this.left !== void 0 && this.right !== void 0) R = Math.max(0, T.width - this.right - this.left);else if (this.width !== void 0) R = this.width;
    let a;
    if (this.top !== void 0 && this.bottom !== void 0) a = Math.max(0, T.height - this.bottom - this.top);else if (this.height !== void 0) a = this.height;
    return new o0(R ?? 0, R ?? Number.POSITIVE_INFINITY, a ?? 0, a ?? Number.POSITIVE_INFINITY);
  }
};
EY = class EY extends O9 {
  fit;
  constructor(T = "loose") {
    super();
    this.fit = T, this.allowHitTestOutsideBounds = !0;
  }
  setupParentData(T) {
    if (!(T.parentData instanceof zw)) T.parentData = new zw();
  }
  getMinIntrinsicWidth(T) {
    return this.getIntrinsicDimension(R => R.getMinIntrinsicWidth(T));
  }
  getMaxIntrinsicWidth(T) {
    return this.getIntrinsicDimension(R => R.getMaxIntrinsicWidth(T));
  }
  getMinIntrinsicHeight(T) {
    return this.getIntrinsicDimension(R => R.getMinIntrinsicHeight(T));
  }
  getMaxIntrinsicHeight(T) {
    return this.getIntrinsicDimension(R => R.getMaxIntrinsicHeight(T));
  }
  getIntrinsicDimension(T) {
    let R = 0;
    for (let a of this.children) if (!a.parentData.isPositioned()) R = Math.max(R, T(a));
    return R;
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.children;
    if (R.length === 0) {
      let h = T.biggest;
      if (Number.isFinite(h.width) && Number.isFinite(h.height)) this.setSize(h.width, h.height);else {
        let i = T.smallest;
        this.setSize(i.width, i.height);
      }
      super.performLayout();
      return;
    }
    let a;
    switch (this.fit) {
      case "loose":
        a = T.loosen();
        break;
      case "expand":
        a = o0.tight(T.biggest.width, T.biggest.height);
        break;
      case "passthrough":
        a = T;
        break;
    }
    let e = !1,
      t = T.minWidth,
      r = T.minHeight;
    for (let h of R) if (!h.parentData.isPositioned()) e = !0, h.layout(a), t = Math.max(t, h.size.width), r = Math.max(r, h.size.height);
    if (e) this.setSize(t, r);else {
      let h = T.biggest;
      this.setSize(h.width, h.height);
    }
    for (let h of R) {
      let i = h.parentData;
      if (i.isPositioned()) this.layoutPositionedChild(h, i);else h.setOffset(0, 0);
    }
    super.performLayout();
  }
  layoutPositionedChild(T, R) {
    let a = R.positionedChildConstraints(this.size);
    T.layout(a);
    let e = 0,
      t = 0;
    if (R.left !== void 0) e = R.left;else if (R.right !== void 0) e = this.size.width - R.right - T.size.width;
    if (R.top !== void 0) t = R.top;else if (R.bottom !== void 0) t = this.size.height - R.bottom - T.size.height;
    T.setOffset(e, t);
  }
};
o1T = class o1T extends O9 {
  _width;
  _height;
  constructor(T, R) {
    super();
    this._width = T, this._height = R;
  }
  updateDimensions(T, R) {
    let a = this._width,
      e = this._height;
    if (this._width = T, this._height = R, a !== T || e !== R) this.markNeedsLayout();
  }
  getMinIntrinsicWidth(T) {
    if (this._width !== void 0) return this._width === 1 / 0 ? 0 : this._width;
    if (this.children.length > 0) return this.children[0].getMinIntrinsicWidth(T);
    return 0;
  }
  getMaxIntrinsicWidth(T) {
    if (this._width !== void 0) return this._width === 1 / 0 ? 1 / 0 : this._width;
    if (this.children.length > 0) return this.children[0].getMaxIntrinsicWidth(T);
    return 0;
  }
  getMinIntrinsicHeight(T) {
    if (this._height !== void 0) return this._height === 1 / 0 ? 0 : this._height;
    if (this.children.length > 0) return this.children[0].getMinIntrinsicHeight(T);
    return 0;
  }
  getMaxIntrinsicHeight(T) {
    if (this._height !== void 0) return this._height === 1 / 0 ? 1 / 0 : this._height;
    if (this.children.length > 0) return this.children[0].getMaxIntrinsicHeight(T);
    return 0;
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R, a;
    if (this._width !== void 0) {
      if (this._width === 1 / 0) R = T.maxWidth;else R = this._width;
    } else if (this.children.length > 0) {
      let t = this.children[0];
      t.layout(T), R = t.size.width;
    } else R = 0;
    if (this._height !== void 0) {
      if (this._height === 1 / 0) a = T.maxHeight;else a = this._height;
    } else if (this.children.length > 0) {
      let t = this.children[0];
      t.layout(T), a = t.size.height;
    } else a = 0;
    let e = T.constrain(R, a);
    if (this.setSize(e.width, e.height), this.children.length > 0) {
      let t = this.children[0],
        r = o0.tight(e.width, e.height);
      t.layout(r), t.setOffset(0, 0);
    }
  }
};
CY = class CY extends O9 {
  widthFactor;
  heightFactor;
  constructor(T, R) {
    super();
    this.widthFactor = T, this.heightFactor = R;
  }
  getMinIntrinsicWidth(T) {
    return (this.children[0]?.getMinIntrinsicWidth(T) ?? 0) * (this.widthFactor ?? 1);
  }
  getMaxIntrinsicWidth(T) {
    return (this.children[0]?.getMaxIntrinsicWidth(T) ?? 0) * (this.widthFactor ?? 1);
  }
  getMinIntrinsicHeight(T) {
    return (this.children[0]?.getMinIntrinsicHeight(T) ?? 0) * (this.heightFactor ?? 1);
  }
  getMaxIntrinsicHeight(T) {
    return (this.children[0]?.getMaxIntrinsicHeight(T) ?? 0) * (this.heightFactor ?? 1);
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.widthFactor !== void 0 || T.maxWidth === Number.POSITIVE_INFINITY,
      a = this.heightFactor !== void 0 || T.maxHeight === Number.POSITIVE_INFINITY,
      e = this.children[0];
    if (!e) {
      let A = R ? 0 : Number.POSITIVE_INFINITY,
        l = a ? 0 : Number.POSITIVE_INFINITY,
        o = isFinite(A) ? Math.max(T.minWidth, Math.min(T.maxWidth, A)) : T.maxWidth,
        n = isFinite(l) ? Math.max(T.minHeight, Math.min(T.maxHeight, l)) : T.maxHeight;
      this.setSize(o, n), super.performLayout();
      return;
    }
    e.layout(T.loosen());
    let t = R ? e.size.width * (this.widthFactor ?? 1) : Number.POSITIVE_INFINITY,
      r = a ? e.size.height * (this.heightFactor ?? 1) : Number.POSITIVE_INFINITY,
      h = isFinite(t) ? Math.max(T.minWidth, Math.min(T.maxWidth, t)) : T.maxWidth,
      i = isFinite(r) ? Math.max(T.minHeight, Math.min(T.maxHeight, r)) : T.maxHeight;
    this.setSize(h, i);
    let c = (this.size.width - e.size.width) / 2,
      s = (this.size.height - e.size.height) / 2;
    e.setOffset(c, s), super.performLayout();
  }
};
n1T = class n1T extends O9 {
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight), super.performLayout();
      return;
    }
    let R = this.children[0],
      a = T.minHeight === T.maxHeight,
      e;
    if (a) e = T;else {
      let t = R.getMaxIntrinsicHeight(T.maxWidth);
      e = new o0(T.minWidth, T.maxWidth, t, t);
    }
    R.layout(e), R.setOffset(0, 0), this.setSize(R.size.width, R.size.height), super.performLayout();
  }
  getMinIntrinsicHeight(T) {
    return this.getMaxIntrinsicHeight(T);
  }
  getMaxIntrinsicHeight(T) {
    if (this.children.length === 0) return 0;
    return this.children[0].getMaxIntrinsicHeight(T);
  }
  getMinIntrinsicWidth(T) {
    if (this.children.length === 0) return 0;
    let R = this.children[0];
    if (!Number.isFinite(T)) T = R.getMaxIntrinsicHeight(Number.POSITIVE_INFINITY);
    return R.getMinIntrinsicWidth(T);
  }
  getMaxIntrinsicWidth(T) {
    if (this.children.length === 0) return 0;
    let R = this.children[0];
    if (!Number.isFinite(T)) T = R.getMaxIntrinsicHeight(Number.POSITIVE_INFINITY);
    return R.getMaxIntrinsicWidth(T);
  }
};
LY = class LY extends O9 {
  _overlap;
  _crossAxisAlignment;
  constructor(T, R) {
    super();
    this._overlap = T, this._crossAxisAlignment = R;
  }
  updateProperties(T, R) {
    this._overlap = T, this._crossAxisAlignment = R, this.markNeedsLayout();
  }
  getMinIntrinsicWidth(T) {
    let R = this.children,
      a = 0;
    for (let e of R) a = Math.max(a, e.getMinIntrinsicWidth(T));
    return a;
  }
  getMaxIntrinsicWidth(T) {
    let R = this.children,
      a = 0;
    for (let e of R) a = Math.max(a, e.getMaxIntrinsicWidth(T));
    return a;
  }
  getMinIntrinsicHeight(T) {
    return this._computeTotalHeight(T, (R, a) => R.getMinIntrinsicHeight(a));
  }
  getMaxIntrinsicHeight(T) {
    return this._computeTotalHeight(T, (R, a) => R.getMaxIntrinsicHeight(a));
  }
  _computeTotalHeight(T, R) {
    let a = this.children;
    if (a.length === 0) return 0;
    let e = 0;
    for (let t of a) e += R(t, T);
    return e -= this._overlap * Math.max(0, a.length - 1), Math.max(0, e);
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.children;
    if (R.length === 0) {
      this.setSize(T.minWidth, T.minHeight);
      return;
    }
    let a = T.minWidth,
      e = 0;
    for (let r = 0; r < R.length; r++) {
      let h = R[r],
        i = this._crossAxisAlignment === "stretch" ? new o0(T.maxWidth, T.maxWidth, 0, 1 / 0) : o0.loose(T.maxWidth, 1 / 0);
      h.layout(i), a = Math.max(a, h.size.width);
      let c = this._computeCrossPosition(h, a);
      if (h.setOffset(c, e), e += h.size.height, r < R.length - 1) e -= this._overlap;
    }
    if (this._crossAxisAlignment !== "start") for (let r of R) {
      let h = this._computeCrossPosition(r, a);
      r.setOffset(h, r.offset.y);
    }
    let t = Math.max(0, e);
    this.setSize(Math.min(a, T.maxWidth), Math.max(T.minHeight, Math.min(t, T.maxHeight)));
  }
  _computeCrossPosition(T, R) {
    switch (this._crossAxisAlignment) {
      case "start":
      case "stretch":
        return 0;
      case "end":
        return R - T.size.width;
      case "center":
        return Math.floor((R - T.size.width) / 2);
      case "baseline":
        return 0;
    }
  }
  paint(T, R = 0, a = 0) {
    let e = T.getSize(),
      t = this.children;
    for (let r = t.length - 1; r >= 0; r--) {
      let h = t[r],
        i = R + this.offset.x + h.offset.x,
        c = a + this.offset.y + h.offset.y,
        s = i + h.size.width,
        A = c + h.size.height;
      if (i >= e.width || c >= e.height || s <= 0 || A <= 0) continue;
      h.paint(T, R + this.offset.x, a + this.offset.y);
    }
  }
};
uR = class uR extends Mn {
  padding;
  child;
  constructor({
    key: T,
    padding: R,
    child: a
  }) {
    super(T ? {
      key: T
    } : {});
    this.padding = R, this.child = a;
  }
  createElement() {
    return new A1T(this);
  }
};
A1T = class A1T extends qm {
  _child;
  _renderObject;
  constructor(T) {
    super(T);
  }
  get paddingWidget() {
    return this.widget;
  }
  get child() {
    return this._child;
  }
  get renderObject() {
    return this._renderObject;
  }
  mount() {
    if (this._renderObject = new p1T(this.paddingWidget.padding), this._renderObject.attach(), this.paddingWidget.child) {
      if (this._child = this.paddingWidget.child.createElement(), this.addChild(this._child), this._child.mount(), this._child.renderObject) this._renderObject.adoptChild(this._child.renderObject);
    }
  }
  unmount() {
    if (this._child) this._child.unmount(), this.removeChild(this._child), this._child = void 0;
    if (this._renderObject) this._renderObject.detach(), this._renderObject = void 0;
    super.unmount();
  }
  update(T) {
    super.update(T);
    let R = this.paddingWidget;
    if (this._renderObject) this._renderObject.updatePadding(R.padding);
    if (R.child && this._child) {
      if (this._child.widget.canUpdate(R.child)) this._child.update(R.child);else if (this._child.unmount(), this.removeChild(this._child), this._child = R.child.createElement(), this.addChild(this._child), this._child.mount(), this._renderObject && this._child.renderObject) this._renderObject.removeAllChildren(), this._renderObject.adoptChild(this._child.renderObject);
    } else if (R.child && !this._child) {
      if (this._child = R.child.createElement(), this.addChild(this._child), this._child.mount(), this._renderObject && this._child.renderObject) this._renderObject.adoptChild(this._child.renderObject);
    } else if (!R.child && this._child) {
      if (this._child.unmount(), this.removeChild(this._child), this._child = void 0, this._renderObject) this._renderObject.removeAllChildren();
    }
  }
  performRebuild() {}
};
p1T = class p1T extends O9 {
  _padding;
  constructor(T) {
    super();
    this._padding = T;
  }
  updatePadding(T) {
    this._padding = T, this.markNeedsLayout();
  }
  get padding() {
    return this._padding;
  }
  performLayout() {
    super.performLayout(), this.sendDebugData({
      padding: this.padding
    });
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this._padding.horizontal,
      a = this._padding.vertical;
    if (this.children.length > 0) {
      let e = new o0(Math.max(0, T.minWidth - R), Math.max(0, T.maxWidth - R), Math.max(0, T.minHeight - a), Math.max(0, T.maxHeight - a)),
        t = this.children[0];
      t.layout(e), t.setOffset(this._padding.left, this._padding.top);
      let r = T.constrain(t.size.width + R, t.size.height + a);
      this.setSize(r.width, r.height);
    } else {
      let e = T.constrain(R, a);
      this.setSize(e.width, e.height);
    }
  }
  getMinIntrinsicWidth(T) {
    let R = this._padding.horizontal,
      a = this._padding.vertical;
    if (this.children.length > 0) {
      let e = this.children[0],
        t = Math.max(0, T - a);
      return e.getMinIntrinsicWidth(t) + R;
    }
    return R;
  }
  getMinIntrinsicHeight(T) {
    let R = this._padding.horizontal,
      a = this._padding.vertical;
    if (this.children.length > 0) {
      let e = this.children[0],
        t = Math.max(0, T - R);
      return e.getMinIntrinsicHeight(t) + a;
    }
    return a;
  }
  getMaxIntrinsicWidth(T) {
    let R = this._padding.horizontal,
      a = this._padding.vertical;
    if (this.children.length > 0) {
      let e = this.children[0],
        t = Math.max(0, T - a);
      return e.getMaxIntrinsicWidth(t) + R;
    }
    return R;
  }
  getMaxIntrinsicHeight(T) {
    let R = this._padding.horizontal,
      a = this._padding.vertical;
    if (this.children.length > 0) {
      let e = this.children[0],
        t = Math.max(0, T - R);
      return e.getMaxIntrinsicHeight(t) + a;
    }
    return a;
  }
  hitTest(T, R, a = 0, e = 0) {
    let t = a + this.offset.x,
      r = e + this.offset.y,
      h = R.x >= t && R.x < t + this.size.width,
      i = R.y >= r && R.y < r + this.size.height;
    if (h && i) {
      let A = {
        x: R.x - t,
        y: R.y - r
      };
      T.add({
        target: this,
        localPosition: A
      });
      for (let l = this.children.length - 1; l >= 0; l--) {
        let o = this.children[l];
        if (o && "hitTest" in o && typeof o.hitTest === "function") o.hitTest(T, R, t, r);
      }
      return !0;
    }
    let c = a + this.offset.x,
      s = e + this.offset.y;
    for (let A of this.children) if ("hitTest" in A && typeof A.hitTest === "function") A.hitTest(T, R, c, s);
    return !1;
  }
};
JY = class JY extends Dn {
  rows;
  columnConfigs;
  borderColor;
  showBorders;
  cellPadding;
  constructor({
    key: T,
    rows: R,
    columnConfigs: a,
    borderColor: e,
    showBorders: t = !0,
    cellPadding: r = TR.symmetric(1, 0)
  }) {
    let h = [];
    for (let i of R) for (let c of i.cells) {
      let s = new uR({
        padding: r,
        child: c.child
      });
      h.push(s);
    }
    super({
      key: T,
      children: h
    });
    this.rows = R, this.columnConfigs = a, this.borderColor = e, this.showBorders = t, this.cellPadding = r;
  }
  createRenderObject() {
    return new EQT({
      rows: this.rows,
      columnConfigs: this.columnConfigs,
      borderColor: this.borderColor,
      showBorders: this.showBorders,
      cellPadding: this.cellPadding
    });
  }
  updateRenderObject(T) {
    T.updateTable({
      rows: this.rows,
      columnConfigs: this.columnConfigs,
      borderColor: this.borderColor,
      showBorders: this.showBorders,
      cellPadding: this.cellPadding
    });
  }
};
EQT = class EQT extends O9 {
  rows;
  columnConfigs;
  borderColor;
  showBorders;
  cellPadding;
  columnWidths = [];
  rowHeights = [];
  constructor({
    rows: T,
    columnConfigs: R,
    borderColor: a,
    showBorders: e,
    cellPadding: t
  }) {
    super();
    this.rows = T, this.columnConfigs = R, this.borderColor = a, this.showBorders = e, this.cellPadding = t;
  }
  updateTable({
    rows: T,
    columnConfigs: R,
    borderColor: a,
    showBorders: e,
    cellPadding: t
  }) {
    this.rows = T, this.columnConfigs = R, this.borderColor = a, this.showBorders = e, this.cellPadding = t, this.markNeedsLayout();
  }
  performLayout() {
    let T = this._lastConstraints;
    if (!T) return;
    this.columnWidths = this.calculateColumnWidths(T), this.rowHeights = this.calculateRowHeights(), this.layoutCells();
    let R = this.getTotalTableWidth(),
      a = this.getTotalTableHeight();
    this.setSize(R, a);
  }
  calculateColumnWidths(T) {
    let R = [],
      a = 0,
      e = 0;
    for (let A = 0; A < this.columnConfigs.length; A++) {
      let l = this.columnConfigs[A];
      if (!l) continue;
      switch (l.widthType) {
        case "fixed":
          {
            e8(l.fixedWidth !== void 0, `Fixed width column ${A} must have fixedWidth specified`);
            let o = l.fixedWidth;
            R[A] = o, a += o;
            break;
          }
        case "intrinsic":
          {
            let o = this.calculateIntrinsicColumnWidth(A);
            R[A] = o, a += o;
            break;
          }
        case "flex":
          e++, R[A] = 0;
          break;
        case "proportional":
          R[A] = 0;
          break;
      }
    }
    let t = 0;
    if (this.showBorders) t += 2, t += Math.max(0, this.columnConfigs.length - 1);
    let r = Math.max(0, T.maxWidth - a - t),
      h = 16,
      i = [],
      c = 0,
      s = 0;
    for (let A = 0; A < this.columnConfigs.length; A++) if (this.columnConfigs[A]?.widthType === "proportional") {
      let l = this.calculateIntrinsicColumnWidth(A),
        o = this.calculateMinColumnWidth(A, h);
      i.push({
        index: A,
        intrinsicWidth: l,
        minWidth: o
      }), c += l, s += o;
    }
    if (i.length > 0 && c > 0) {
      let A = r - e * 0,
        l = c <= A,
        o = A;
      for (let n = 0; n < i.length; n++) {
        let p = i[n];
        if (!p) continue;
        if (n === i.length - 1) {
          let _ = Math.max(p.minWidth, o);
          R[p.index] = l ? Math.max(p.intrinsicWidth, _) : _;
        } else {
          let _ = p.intrinsicWidth / c,
            m = Math.floor(A * _),
            b = l ? Math.max(p.intrinsicWidth, m) : Math.max(p.minWidth, m);
          R[p.index] = b, o -= b;
        }
      }
    } else if (i.length > 0) {
      let A = Math.floor(r / i.length);
      for (let l of i) R[l.index] = A;
    }
    if (e > 0) {
      let A = R.reduce((n, p) => n + p, 0),
        l = Math.max(0, r - A + a),
        o = Math.floor(l / e);
      for (let n = 0; n < R.length; n++) if (this.columnConfigs[n]?.widthType === "flex") R[n] = o;
    }
    if (T.hasBoundedWidth) {
      let A = Math.max(0, T.maxWidth - t),
        l = R.reduce((o, n) => o + n, 0);
      if (l > A && l > 0) return this.shrinkColumnWidths(R, A);
    }
    return R;
  }
  shrinkColumnWidths(T, R) {
    if (T.length === 0) return [];
    if (R <= 0) return T.map(() => 0);
    let a = T.reduce((i, c) => i + c, 0);
    if (a <= R || a === 0) return [...T];
    let e = T.map(i => Math.floor(i / a * R)),
      t = R - e.reduce((i, c) => i + c, 0);
    if (t <= 0) return e;
    let r = T.map((i, c) => ({
      index: c,
      fraction: i / a * R - e[c]
    }));
    r.sort((i, c) => c.fraction - i.fraction);
    let h = 0;
    while (t > 0) {
      let i = r[h % r.length];
      if (!i) break;
      e[i.index] = (e[i.index] ?? 0) + 1, t -= 1, h += 1;
    }
    return e;
  }
  calculateIntrinsicColumnWidth(T) {
    let R = 0,
      a = 0;
    for (let e = 0; e < this.rows.length; e++) {
      let t = this.rows[e];
      if (!t) continue;
      for (let r = 0; r < t.cells.length; r++) {
        if (r === T) {
          let h = t.cells[r],
            i = this.children[a];
          if (h && i) {
            let c = i.getMaxIntrinsicWidth(Number.POSITIVE_INFINITY);
            R = Math.max(R, c);
          }
        }
        a++;
      }
    }
    return R;
  }
  calculateMinColumnWidth(T, R) {
    let a = 0,
      e = 0,
      t = this.cellPadding.left + this.cellPadding.right;
    for (let r = 0; r < this.rows.length; r++) {
      let h = this.rows[r];
      if (!h) continue;
      for (let i = 0; i < h.cells.length; i++) {
        if (i === T) {
          let c = this.children[e];
          if (c) {
            let s = c.getMinIntrinsicWidth(Number.POSITIVE_INFINITY),
              A = Math.min(s, R + t);
            a = Math.max(a, A);
          }
        }
        e++;
      }
    }
    return a;
  }
  calculateRowHeights() {
    let T = [],
      R = 0;
    for (let a = 0; a < this.rows.length; a++) {
      let e = this.rows[a];
      if (!e) continue;
      let t = 1;
      for (let r = 0; r < e.cells.length; r++) {
        let h = e.cells[r],
          i = this.children[R],
          c = this.columnWidths[r];
        if (!h || !i) {
          R++;
          continue;
        }
        let s = this.measureCellHeight(i, c || 0);
        t = Math.max(t, s), R++;
      }
      T[a] = t;
    }
    return T;
  }
  layoutCells() {
    let T = 0;
    for (let R = 0; R < this.rows.length; R++) {
      let a = this.rows[R];
      if (!a) continue;
      for (let e = 0; e < a.cells.length; e++) {
        let t = a.cells[e],
          r = this.children[T];
        if (!t || !r) {
          T++;
          continue;
        }
        let h = this.columnWidths[e] || 0,
          i = this.rowHeights[R] || 1,
          c = o0.tight(h, i);
        r.layout(c);
        let s = this.getColumnOffset(e),
          A = this.getRowOffset(R),
          l = s,
          o = A;
        r.setOffset(l, o), T++;
      }
    }
  }
  getTotalTableWidth() {
    let T = this.columnWidths.reduce((R, a) => R + a, 0);
    if (this.showBorders) T += 2, T += Math.max(0, this.columnWidths.length - 1);
    return T;
  }
  getTotalTableHeight() {
    let T = this.rowHeights.reduce((R, a) => R + a, 0);
    if (this.showBorders) T += 2, T += Math.max(0, this.rowHeights.length - 1);
    return T;
  }
  getColumnOffset(T) {
    let R = this.showBorders ? 1 : 0;
    for (let a = 0; a < T; a++) if (R += this.columnWidths[a] || 0, this.showBorders) R += 1;
    return R;
  }
  getRowOffset(T) {
    let R = this.showBorders ? 1 : 0;
    for (let a = 0; a < T; a++) if (R += this.rowHeights[a] || 0, this.showBorders) R += 1;
    return R;
  }
  getMaxIntrinsicWidth(T) {
    let R = 0;
    for (let a = 0; a < this.columnConfigs.length; a++) {
      let e = this.columnConfigs[a];
      if (!e) continue;
      switch (e.widthType) {
        case "fixed":
          R += e.fixedWidth || 0;
          break;
        case "intrinsic":
          {
            let t = this.calculateIntrinsicColumnWidth(a);
            R += t;
            break;
          }
        case "flex":
          R += 0;
          break;
      }
    }
    if (this.showBorders) R += 2, R += Math.max(0, this.columnConfigs.length - 1);
    return R;
  }
  measureCellHeight(T, R) {
    let a = new o0(R, R, 0, Number.POSITIVE_INFINITY);
    return T.layout(a), T.size.height;
  }
  paint(T, R, a) {
    let e = R + this.offset.x,
      t = a + this.offset.y;
    if (!this.showBorders) {
      super.paint(T, R, a);
      return;
    }
    this.paintTableBorders(T, e, t), super.paint(T, R, a);
  }
  setBorderCell(T, R, a, e) {
    let t = T.getCell(R, a),
      r = {
        fg: this.borderColor
      };
    if (t?.style.bg) r.bg = t.style.bg;
    T.setCell(R, a, a9(e, r));
  }
  paintTableBorders(T, R, a) {
    let e = this.getTotalTableWidth(),
      t = this.getTotalTableHeight();
    this.drawBox(T, R, a, e, t);
    let r = a + 1;
    for (let i = 0; i < this.rowHeights.length - 1; i++) {
      r += this.rowHeights[i] || 0;
      for (let c = R + 1; c < R + e - 1; c++) this.setBorderCell(T, c, r, "\u2500");
      this.setBorderCell(T, R, r, "\u251C"), this.setBorderCell(T, R + e - 1, r, "\u2524"), r += 1;
    }
    let h = R + 1;
    for (let i = 0; i < this.columnWidths.length - 1; i++) {
      h += this.columnWidths[i] || 0;
      for (let c = a + 1; c < a + t - 1; c++) if (T.getCell(h, c)?.char === "\u2500") this.setBorderCell(T, h, c, "\u253C");else this.setBorderCell(T, h, c, "\u2502");
      this.setBorderCell(T, h, a, "\u252C"), this.setBorderCell(T, h, a + t - 1, "\u2534"), h += 1;
    }
  }
  drawBox(T, R, a, e, t) {
    for (let r = 1; r < e - 1; r++) this.setBorderCell(T, R + r, a, "\u2500");
    for (let r = 1; r < e - 1; r++) this.setBorderCell(T, R + r, a + t - 1, "\u2500");
    for (let r = 1; r < t - 1; r++) this.setBorderCell(T, R, a + r, "\u2502");
    for (let r = 1; r < t - 1; r++) this.setBorderCell(T, R + e - 1, a + r, "\u2502");
    this.setBorderCell(T, R, a, "\u256D"), this.setBorderCell(T, R + e - 1, a, "\u256E"), this.setBorderCell(T, R, a + t - 1, "\u2570"), this.setBorderCell(T, R + e - 1, a + t - 1, "\u256F");
  }
};
iZT = class iZT extends O9 {
  constructor() {
    super();
    this.allowHitTestOutsideBounds = !0;
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.children,
      a = T.minWidth,
      e = T.minHeight;
    for (let t of R) t.layout(T), a = Math.max(a, t.size.width), e = Math.max(e, t.size.height);
    this.setSize(Math.min(T.maxWidth, a), Math.min(T.maxHeight, e));
  }
};
pZT = class pZT extends O9 {
  _link;
  _showWhenUnlinked;
  _followerOffset;
  _cachedPosition = null;
  constructor(T, R, a) {
    super();
    this._link = T, this._showWhenUnlinked = R, this._followerOffset = a;
  }
  get link() {
    return this._link;
  }
  set link(T) {
    this._link = T, this._cachedPosition = null, this.markNeedsLayout();
  }
  get showWhenUnlinked() {
    return this._showWhenUnlinked;
  }
  set showWhenUnlinked(T) {
    if (this._showWhenUnlinked !== T) this._showWhenUnlinked = T, this.markNeedsLayout();
  }
  setFollowerOffset(T) {
    if (this._followerOffset.x !== T.x || this._followerOffset.y !== T.y) this._followerOffset = {
      ...T
    }, this.markNeedsLayout();
  }
  calculatePosition() {
    let T = this._link.getTargetTransform();
    if (!T) return null;
    return {
      x: T.position.x + this._followerOffset.x,
      y: T.position.y + this._followerOffset.y
    };
  }
  getParentGlobalOffset() {
    let T = 0,
      R = 0,
      a = this.parent;
    while (a && a instanceof O9) T += a.offset.x, R += a.offset.y, a = a.parent;
    return {
      x: T,
      y: R
    };
  }
  shouldShow() {
    return this._link.target !== null || this._showWhenUnlinked;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), !this.shouldShow()) {
      this.setSize(0, 0), super.performLayout();
      return;
    }
    let R = this.calculatePosition();
    if (this._cachedPosition = R, R) {
      let a = this.getParentGlobalOffset();
      this.setOffset(R.x - a.x, R.y - a.y);
    }
    if (this.children.length > 0) {
      let a = this.children[0];
      a.layout(T.loosen());
      let e = a.size;
      this.setSize(e.width, e.height);
    } else this.setSize(0, 0);
    super.performLayout();
  }
  getCurrentPosition() {
    return this._cachedPosition;
  }
  setOffset(T, R) {
    super.setOffset(T, R);
  }
  paint(T, R = 0, a = 0) {
    super.paint(T, R, a);
  }
};
bZT = class bZT extends O9 {
  _link;
  _globalPosition = {
    x: 0,
    y: 0
  };
  constructor(T) {
    super();
    this._link = T;
  }
  get link() {
    return this._link;
  }
  set link(T) {
    if (this._link === T) return;
    this._link._setTarget(null), this._link = T, this._link._setTarget(this);
  }
  attach() {
    super.attach(), this._link._setTarget(this);
  }
  detach() {
    this._link._setTarget(null), super.detach();
  }
  getGlobalPosition() {
    let T = this.offset.x,
      R = this.offset.y,
      a = this.parent;
    while (a && a instanceof O9) T += a.offset.x, R += a.offset.y, a = a.parent;
    return {
      x: T,
      y: R
    };
  }
  getSize() {
    let T = this.size;
    return {
      width: T.width,
      height: T.height
    };
  }
  updateGlobalPosition() {
    let T = {
      ...this._globalPosition
    };
    if (this._globalPosition = this.getGlobalPosition(), T.x !== this._globalPosition.x || T.y !== this._globalPosition.y) this._link._notifyFollowers();
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length > 0) {
      let R = this.children[0];
      R.layout(T);
      let a = R.size;
      this.setSize(a.width, a.height);
    } else this.setSize(0, 0);
    this.updateGlobalPosition(), super.performLayout();
  }
};
sQ = class sQ extends O9 {
  _offstage;
  constructor(T) {
    super();
    this._offstage = T;
  }
  get offstage() {
    return this._offstage;
  }
  set offstage(T) {
    if (T === this._offstage) return;
    this._offstage = T, this.markNeedsLayout();
  }
  getMinIntrinsicWidth(T) {
    if (this._offstage) return 0;
    return this.children[0]?.getMinIntrinsicWidth(T) ?? 0;
  }
  getMaxIntrinsicWidth(T) {
    if (this._offstage) return 0;
    return this.children[0]?.getMaxIntrinsicWidth(T) ?? 0;
  }
  getMinIntrinsicHeight(T) {
    if (this._offstage) return 0;
    return this.children[0]?.getMinIntrinsicHeight(T) ?? 0;
  }
  getMaxIntrinsicHeight(T) {
    if (this._offstage) return 0;
    return this.children[0]?.getMaxIntrinsicHeight(T) ?? 0;
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.children[0];
    if (this._offstage) {
      if (this.setSize(0, 0), R) R.layout(T), R.setOffset(0, 0);
    } else if (R) {
      R.layout(T);
      let a = T.constrain(R.size.width, R.size.height);
      this.setSize(a.width, a.height), R.setOffset(0, 0);
    } else {
      let a = T.smallest;
      this.setSize(a.width, a.height);
    }
    super.performLayout();
  }
  paint(T, R, a) {
    if (this._offstage) return;
    super.paint(T, R, a);
  }
  hitTest(T, R, a, e) {
    if (this._offstage) return !1;
    return super.hitTest(T, R, a, e);
  }
};
_RR = class _RR extends O9 {
  maxHeight;
  borderColor;
  backgroundColor;
  borderStyle;
  hasBanner;
  userHeight;
  constructor(T, R = Gt.default().colorScheme.border, a = Gt.default().colorScheme.background, e = "rounded", t = !1, r) {
    super();
    this.maxHeight = T, this.borderColor = R, this.backgroundColor = a, this.borderStyle = e, this.hasBanner = t, this.userHeight = r;
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.children;
    if (R.length === 0) {
      this.setSize(T.minWidth, 2), super.performLayout();
      return;
    }
    let a = R[0];
    if (!a) {
      this.setSize(T.minWidth, 2), super.performLayout();
      return;
    }
    let e = R.length > 1 ? R[1] : void 0,
      t = R.length > 2 ? R[2] : void 0,
      r = T.maxWidth,
      h = Math.floor(r / 2),
      i;
    if (this.userHeight !== void 0) i = Math.max(4, this.userHeight);else i = this.getMinIntrinsicHeight(r);
    let c = Math.min(i, T.maxHeight);
    if (this.maxHeight) c = Math.min(c, this.maxHeight);
    this.setSize(r, c);
    let s = c - 2,
      A = e || t ? h - 2 : r - 2,
      l = new o0(0, A, 0, Math.max(0, s));
    if (a.layout(l), a.setOffset(1, 1), e || t) {
      let o = r - h - 2,
        n = Math.max(0, Math.floor(s)),
        p = b => new o0(0, o, 0, Math.max(0, Math.floor(b))),
        _ = n,
        m = 0;
      if (e) {
        let b = e.getMaxIntrinsicHeight(o),
          y = Math.min(b, _);
        e.layout(p(y)), m = e.size.height, e.setOffset(h + 1, 1), _ = Math.max(0, _ - m);
      }
      if (e && t && m > 0) _ = Math.max(0, _ - 1);
      if (t) {
        let b = t.getMaxIntrinsicHeight(o),
          y = Math.min(b, _);
        t.layout(p(y));
        let u = m > 0 ? m + 2 : 1;
        t.setOffset(h + 1, u);
      }
    }
    super.performLayout();
  }
  getMinIntrinsicHeight(T) {
    if (this.userHeight !== void 0) return Math.max(4, this.userHeight);
    let R = this.children;
    if (R.length === 0) return 2;
    let a = R[0];
    if (!a) return 2;
    let e = R.length > 1 ? R[1] : void 0,
      t = R.length > 2 ? R[2] : void 0,
      r = Math.floor(T / 2),
      h = e || t ? r : T,
      i = a.getMinIntrinsicHeight(h - 2),
      c = Math.min(i, 50),
      s = 0;
    if (e || t) {
      let A = T - r - 2,
        l = e ? e.getMaxIntrinsicHeight(A) : 0,
        o = t ? t.getMaxIntrinsicHeight(A) : 0;
      s = l + o + (l > 0 && o > 0 ? 1 : 0);
    }
    return Math.max(c, s) + 2;
  }
  getMaxIntrinsicHeight(T) {
    return this.getMinIntrinsicHeight(T);
  }
  paint(T, R = 0, a = 0) {
    let e = Math.floor(R + this.offset.x),
      t = Math.floor(a + this.offset.y);
    T.fill(e, t, this.size.width, this.size.height, " ", {
      bg: this.backgroundColor
    }), super.paint(T, R, a), this._paintGridBorders(T, e, t);
  }
  _paintGridBorders(T, R, a) {
    let e = this.size.width,
      t = this.size.height,
      r = this.children,
      h = r.length > 1,
      i = r.length > 1 ? r[1] : void 0,
      c = r.length > 2 ? r[2] : void 0,
      s = {
        fg: this.borderColor,
        bg: this.backgroundColor
      },
      A = Math.floor(e / 2),
      l = (() => {
        return this.borderStyle === "rounded" ? {
          tl: "\u256D",
          tr: "\u256E",
          bl: "\u2570",
          br: "\u256F"
        } : {
          tl: "\u250C",
          tr: "\u2510",
          bl: "\u2514",
          br: "\u2518"
        };
      })();
    for (let o = 0; o < e; o++) T.setChar(R + o, a, "\u2500", s, 1);
    for (let o = 0; o < e; o++) T.setChar(R + o, a + t - 1, "\u2500", s, 1);
    for (let o = 0; o < t; o++) T.setChar(R, a + o, "\u2502", s, 1);
    for (let o = 0; o < t; o++) T.setChar(R + e - 1, a + o, "\u2502", s, 1);
    if (this.hasBanner) T.setChar(R, a, "\u251C", s, 1), T.setChar(R + e - 1, a, "\u2524", s, 1);else T.setChar(R, a, l.tl, s, 1), T.setChar(R + e - 1, a, l.tr, s, 1);
    if (T.setChar(R, a + t - 1, l.bl, s, 1), T.setChar(R + e - 1, a + t - 1, l.br, s, 1), h) {
      for (let o = 1; o < t - 1; o++) T.setChar(R + A, a + o, "\u2502", s, 1);
      T.setChar(R + A, a, "\u252C", s, 1), T.setChar(R + A, a + t - 1, "\u2534", s, 1);
    }
    if (i && c && i.size.height > 0) {
      let o = i.offset.y + i.size.height;
      for (let n = A + 1; n < e - 1; n++) T.setChar(R + n, a + o, "\u2500", s, 1);
      T.setChar(R + A, a + o, "\u251C", s, 1), T.setChar(R + e - 1, a + o, "\u2524", s, 1);
    }
  }
};
a0R = class a0R extends wR {
  toolboxes = [];
  subscription = null;
  initState() {
    this.subscription = this.widget.props.toolboxService.toolboxes.subscribe(T => {
      this.toolboxes = T, this.setState(() => {});
    });
  }
  dispose() {
    this.subscription?.unsubscribe(), super.dispose();
  }
  statusIcon(T) {
    let R = Xa.default(),
      {
        colors: a,
        app: e
      } = R;
    switch (T) {
      case "pending":
        return {
          icon: "\u25CC",
          color: a.warning
        };
      case "registered":
        return {
          icon: "\u2713",
          color: e.toolSuccess
        };
      case "failed":
        return {
          icon: "\u2717",
          color: e.toolError
        };
      case "duplicate":
        return {
          icon: "\u25C7",
          color: a.warning
        };
      default:
        return {
          icon: "?",
          color: a.foreground
        };
    }
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R;
    if (this.toolboxes.length === 0) return new xT({
      text: new G("No toolboxes found.", new cT({
        dim: !0
      }))
    });
    let t = [],
      r = this.toolboxes.length,
      h = this.toolboxes.reduce((c, s) => c + s.tools.length, 0),
      i = this.toolboxes.reduce((c, s) => c + s.tools.filter(A => A.status === "registered").length, 0);
    t.push(new G(`${r} ${o9(r, "toolbox")} with ${i}/${h} ${o9(h, "tool")} registered

`, new cT({
      bold: !0
    })));
    for (let c of this.toolboxes) {
      let s = c.tools.length,
        A = c.tools.filter(l => l.status === "registered").length;
      if (c.discovering) {
        let l = c.tools.filter(o => o.status !== "pending").length;
        t.push(new G("\u25CC ", new cT({
          color: a.warning
        }))), t.push(new G(c.path, new cT({
          bold: !0
        }))), t.push(new G(` discovering ${l}/${s}...
`, new cT({
          dim: !0
        })));
      } else if (t.push(new G("\u25CF ", new cT({
        color: e.toolSuccess
      }))), t.push(new G(c.path, new cT({
        bold: !0
      }))), s > 0) t.push(new G(` ${A}/${s} ${o9(s, "tool")}
`, new cT({
        dim: !0
      })));else t.push(new G(`
`));
      if (c.tools.length === 0) t.push(new G(`  \u2514\u2500 No tools available
`, new cT({
        dim: !0
      })));else for (let l of c.tools) {
        let {
          icon: o,
          color: n
        } = this.statusIcon(l.status);
        if (t.push(new G(`  ${o} `, new cT({
          color: n
        }))), t.push(new G(l.name, new cT({
          color: l.status === "pending" ? a.warning : e.link
        }))), l.status === "pending") t.push(new G(" discovering...", new cT({
          dim: !0
        })));else if (l.description) {
          let p = l.description.replace(/\s+/g, " ").trim();
          if (p.length > 50) p = p.slice(0, 47) + "...";
          t.push(new G(` ${p}`, new cT({
            dim: !0
          })));
        }
        if (l.error) {
          let p = l.error.replace(/\s+/g, " ").trim();
          if (p.length > 40) p = p.slice(0, 37) + "...";
          t.push(new G(` ${p}`, new cT({
            color: e.toolError
          })));
        }
        t.push(new G(`
`));
      }
      t.push(new G(`
`));
    }
    return new I3({
      child: new xT({
        text: new G("", void 0, t)
      })
    });
  }
};
E9R = class E9R extends O9 {
  get headerBox() {
    return this.children[0];
  }
  get bodyBox() {
    return this.children[1];
  }
  performLayout() {
    let T = this._lastConstraints;
    if (!T) return;
    let R = this.headerBox,
      a = this.bodyBox;
    if (!R || !a) {
      this.setSize(T.minWidth, T.minHeight);
      return;
    }
    let e = new o0(T.minWidth, T.maxWidth, 0, T.maxHeight);
    R.layout(e), R.setOffset(0, 0);
    let t = new o0(T.minWidth, T.maxWidth, 0, Number.POSITIVE_INFINITY);
    a.layout(t), a.setOffset(0, R.size.height);
    let r = R.size.height + a.size.height,
      h = T.maxWidth;
    this.setSize(h, r);
  }
  paint(T, R, a) {
    let e = this.headerBox,
      t = this.bodyBox;
    if (!e || !t) {
      super.paint(T, R, a);
      return;
    }
    super.paint(T, R, a);
    let r = L50(T);
    if (!r) return;
    let h = R + this.offset.x,
      i = a + this.offset.y,
      c = i + this.size.height,
      s = i + e.offset.y,
      A = e.size.height,
      l = r.y,
      o = r.y + r.height,
      n = c > l && i < o,
      p = s < l;
    if (!n || !p) return;
    let _ = l;
    if (c - l < A) _ = c - A;
    if (_ + A <= l) return;
    let m = h + e.offset.x;
    T.fill(r.x, _, r.width, A, " "), e.paint(T, m, _);
  }
};
Bs = class Bs extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    return this.buildToolWidget(T);
  }
  buildToolWidget(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = nhT(R);
    if (e.startsWith("tb__")) return this.buildToolboxTool(T, R, a);
    if (e.startsWith("sa__")) return this.buildSubagentTool(T, R, a);
    switch (e) {
      case "todo_write":
        return this.buildTodoWriteTool(T, R, a);
      case "todo_read":
        return this.buildGenericTool(T, R, a, void 0, "Read TODOs");
      case "Read":
        return this.buildReadTool(R, a);
      case "create_file":
        return this.buildCreateFileTool(R, a);
      case "edit_file":
        return this.buildEditFileTool(R, a);
      case "apply_patch":
        return this.buildApplyPatchTool(R, a);
      case "undo_edit":
        {
          let {
            input: t
          } = R;
          return this.buildGenericTool(T, R, a, t.path, "Undo Edit");
        }
      case "glob":
      case "Glob":
        {
          let {
            input: t
          } = R;
          return this.buildGenericTool(T, R, a, t.filePattern, "Glob");
        }
      case rN:
        {
          let {
            input: t
          } = R;
          return this.buildGenericTool(T, R, a, t.path, "List");
        }
      case ja:
        return this.buildCodebaseSearchTool(T, R, a);
      case "Grep":
        return this.buildGrepTool(R, a);
      case kET:
        return this.buildLibrarianReadTool(T, R, a);
      case xET:
        return this.buildLibrarianSearchTool(T, R, a);
      case $ET:
        return this.buildLibrarianGlobTool(T, R, a);
      case IET:
        return this.buildLibrarianListDirectoryTool(T, R, a);
      case gET:
        return this.buildLibrarianListRepositoriesTool(T, R, a);
      case fET:
        return this.buildLibrarianCommitSearchTool(T, R, a);
      case vET:
        return this.buildLibrarianDiffTool(T, R, a);
      case QS:
        return this.buildWebSearchTool(T, R, a);
      case "read_web_page":
        return this.buildReadWebPageTool(T, R, a);
      case "look_at":
        return new N9R({
          toolUse: R,
          toolRun: a
        });
      case Ij:
        return this.buildReadThreadTool(T, R, a);
      case ck:
        return this.buildFindThreadTool(T, R, a);
      case "Bash":
        return this.buildBashTool(R, a);
      case "shell_command":
        return this.buildShellCommandTool(R, a);
      case "Task":
        return this.buildTaskTool(T, R, a);
      case "oracle":
        return this.buildOracleTool(T, R, a);
      case "code_review":
        return this.buildCodeReviewSubagentTool(T, R, a);
      case "librarian":
        return this.buildLibrarianTool(T, R, a);
      case "mermaid":
        return this.buildMermaidTool(T, R, a);
      case "chart":
        return this.buildChartTool(T, R, a);
      case uET:
        return this.buildWalkthroughDiagramTool(T, R, a);
      case "format_file":
        {
          let {
            input: t
          } = R;
          return this.buildGenericTool(T, R, a, t.path, "Format");
        }
      case "skill":
        return new chT({
          toolUse: R,
          toolRun: a
        });
      case "get_diagnostics":
        {
          let {
            input: t
          } = R;
          return this.buildGenericTool(T, R, a, t.path, "Get Diagnostics");
        }
      case jET:
        return this.buildReplTool(T, R, a);
      case db:
        return new w9R({
          toolUse: R,
          toolRun: a
        });
      case "handoff":
        {
          let t = a,
            r = t.status === "done" && "result" in t ? t.result : void 0,
            h = r?.newThreadID ? vb.getThreadViewState(T, r.newThreadID) : void 0;
          return new S9R({
            toolUse: R,
            toolRun: t,
            threadViewState: h
          });
        }
      case "painter":
      case "render_agg_man":
        return new U9R({
          toolUse: R,
          toolRun: a
        });
      default:
        return this.buildGenericTool(T, R, a, JSON.stringify(R.input));
    }
  }
  buildTodoWriteTool(T, R, a) {
    return new x3({
      name: "Update TODOs",
      status: a.status
    });
  }
  buildLibrarianTool(T, R, a) {
    let e = a,
      t = e.status === "done" || e.status === "in-progress" ? e.result : void 0;
    return new qv({
      toolUse: R,
      toolRun: a,
      name: "Librarian",
      inputSection: typeof R.input.query === "string" ? {
        content: R.input.query
      } : void 0,
      outputSection: t && typeof t === "string" ? {
        content: t
      } : void 0,
      subagentContent: this.props.subagentContent,
      hideHeader: this.props.hideHeader
    });
  }
  buildOracleTool(T, R, a) {
    return new M9R({
      toolUse: R,
      toolRun: a,
      subagentContent: this.props.subagentContent,
      hideHeader: this.props.hideHeader
    });
  }
  buildReadTool(T, R) {
    return new B9R({
      toolUse: T,
      toolRun: R
    });
  }
  buildEditFileTool(T, R) {
    return new j9R({
      toolUse: T,
      toolRun: R
    });
  }
  buildApplyPatchTool(T, R) {
    return new $9R({
      toolUse: T,
      toolRun: R
    });
  }
  buildCodebaseSearchTool(T, R, a) {
    let e = a.status === "done" ? a.result : a.status === "in-progress" ? a.result : void 0;
    return new qv({
      toolUse: R,
      toolRun: a,
      name: "Search",
      inputSection: typeof R.input.query === "string" ? {
        content: R.input.query
      } : void 0,
      outputSection: e && typeof e === "string" ? {
        content: e
      } : void 0,
      subagentContent: this.props.subagentContent,
      hideHeader: this.props.hideHeader
    });
  }
  buildGrepTool(T, R) {
    return new W9R({
      toolUse: T,
      toolRun: R
    });
  }
  buildWebSearchTool(T, R, a) {
    return new t8R({
      context: T,
      toolUse: R,
      toolRun: a
    });
  }
  buildReadWebPageTool(T, R, a) {
    let e = $R.of(T).colors,
      t = new cT({
        color: e.foreground,
        dim: !0
      }),
      r = [],
      h = typeof R.input.url === "string" ? R.input.url : void 0,
      i = typeof R.input.objective === "string" ? R.input.objective : void 0;
    if (h) {
      let c = [new G(h, new cT({
        color: e.accent
      }), void 0, {
        id: Math.random().toString(36),
        uri: h
      }, () => je(T, h))];
      if (i) c.push(new G(` ${i}`, t));
      if (P9R(a)) c.push(new G(" \u2022 Powered by Parallel", new cT({
        dim: !0
      })));
      r.push(new xT({
        text: new G("", void 0, c),
        selectable: !0,
        maxLines: 1,
        overflow: "ellipsis"
      }));
    }
    return new x3({
      name: "Web Page",
      status: a.status,
      children: r
    });
  }
  buildReadThreadTool(T, R, a) {
    return new r8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildFindThreadTool(T, R, a) {
    return new i8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildBashTool(T, R) {
    return new z9R({
      toolUse: T,
      toolRun: R,
      toolProgress: this.props.toolProgress
    });
  }
  buildShellCommandTool(T, R) {
    return new F9R({
      toolUse: T,
      toolRun: R,
      toolProgress: this.props.toolProgress
    });
  }
  buildReplTool(T, R, a) {
    return new V9R({
      toolUse: R,
      toolRun: a
    });
  }
  buildSubagentTool(T, R, a) {
    let e = a.status === "done" ? a.result : a.status === "in-progress" ? a.result : void 0,
      t = R.name.replace(/^sa__/, "").split(/[_-]/).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(" ");
    return new shT({
      toolUse: R,
      toolRun: a,
      name: t,
      inputPrompt: typeof R.input.prompt === "string" ? R.input.prompt : void 0,
      outputResult: e && typeof e === "string" ? e : void 0,
      hideHeader: this.props.hideHeader
    });
  }
  buildToolboxTool(T, R, a) {
    return new Z9R({
      context: T,
      toolUse: R,
      toolRun: a,
      toolProgress: this.props.toolProgress
    });
  }
  buildTaskTool(T, R, a) {
    return new ohT({
      toolUse: R,
      toolRun: a,
      subagentContent: this.props.subagentContent,
      hideHeader: this.props.hideHeader
    });
  }
  buildCodeReviewSubagentTool(T, R, a) {
    let e = a.status === "in-progress" ? "Reviewing code" : "Reviewed code";
    return new qv({
      toolUse: R,
      toolRun: a,
      name: e,
      subagentContent: this.props.subagentContent,
      hideHeader: this.props.hideHeader
    });
  }
  buildMermaidTool(T, R, a) {
    let e = $R.of(T),
      t = R.input?.code || "",
      r = t.trim() ? `https://mermaid.live/edit#base64:${iq0.from(JSON.stringify({
        code: TyT(t),
        mermaid: xVR
      }), "utf8").toString("base64")}` : void 0,
      h,
      i = [],
      c = [];
    if (r) c.push(new H3({
      uri: r,
      text: "View on mermaid.live",
      style: new cT({
        color: e.app.fileReference,
        dim: !0,
        underline: !0
      })
    }));
    if (a.status === "error" && a.error?.message) i.push(new G(`
`)), i.push(new G(`  Error: ${a.error.message}`, new cT({
      color: e.app.toolError
    })));else if (a.status === "done" && t.trim()) try {
      let s = x50(TyT(t)),
        A = new Q3();
      A.followMode = !1, h = new uR({
        padding: TR.only({
          top: 1
        }),
        child: new I3({
          scrollDirection: "horizontal",
          autofocus: !1,
          keyboardScrolling: !1,
          controller: A,
          child: new xT({
            text: new G(s, new cT({
              color: e.colors.foreground
            })),
            selectable: !0
          })
        })
      });
    } catch {
      i.push(new G(`
`)), i.push(new G("  (Unable to render diagram)", new cT({
        color: e.colors.foreground,
        dim: !0
      })));
    }
    return new x3({
      name: "Mermaid",
      status: a.status,
      children: c.length > 0 ? c : void 0,
      tail: i.length > 0 ? i : void 0,
      content: h
    });
  }
  buildChartTool(T, R, a) {
    return new c8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildWalkthroughDiagramTool(T, R, a) {
    let e = $R.of(T),
      t = e.colors,
      r = a,
      h = R.input?.nodes;
    if (typeof h === "string") try {
      h = JSON.parse(h);
    } catch {
      h = void 0;
    }
    let i = h && typeof h === "object" ? Object.keys(h).length : 0,
      c = [];
    c.push(new xT({
      text: new G(`${i} nodes`, new cT({
        color: t.foreground,
        dim: !0
      })),
      selectable: !0
    }));
    let s = [];
    if (a.status === "error" && a.error?.message) s.push(new G(`
`)), s.push(new G(`  Error: ${a.error.message}`, new cT({
      color: e.app.toolError
    })));else if (r.status === "done" && r.result.viewUrl) {
      let A = new G0({
        onClick: () => je(T, r.result.viewUrl),
        cursor: "pointer",
        child: new xT({
          text: new G("View", new cT({
            color: e.app.link
          })),
          selectable: !0
        })
      });
      c.push(A);
    }
    return new x3({
      name: "Walkthrough",
      status: a.status,
      children: c,
      tail: s.length > 0 ? s : void 0
    });
  }
  buildCreateFileTool(T, R) {
    return new v9R({
      toolUse: T,
      toolRun: R
    });
  }
  buildLibrarianReadTool(T, R, a) {
    return new T8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildLibrarianSearchTool(T, R, a) {
    return new TD({
      toolUse: R,
      toolRun: a,
      name: "Search",
      patternField: "pattern"
    });
  }
  buildLibrarianGlobTool(T, R, a) {
    return new TD({
      toolUse: R,
      toolRun: a,
      name: "Glob",
      patternField: "filePattern"
    });
  }
  buildLibrarianListDirectoryTool(T, R, a) {
    return new R8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildLibrarianListRepositoriesTool(T, R, a) {
    return new a8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildLibrarianCommitSearchTool(T, R, a) {
    return new TD({
      toolUse: R,
      toolRun: a,
      name: "Commit Search",
      patternField: "query"
    });
  }
  buildLibrarianDiffTool(T, R, a) {
    return new e8R({
      toolUse: R,
      toolRun: a
    });
  }
  buildGenericTool(T, R, a, e, t) {
    return new q9R({
      context: T,
      toolUse: R,
      toolRun: a,
      detail: e,
      name: t
    });
  }
};