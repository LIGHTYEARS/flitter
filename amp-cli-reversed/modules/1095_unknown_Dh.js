function HUT() {}
function At(T) {
  return typeof T == "object" && T !== null || typeof T == "function";
}
function f8(T, R) {
  try {
    Object.defineProperty(T, "name", {
      value: R,
      configurable: !0
    });
  } catch (a) {}
}
function zt(T) {
  return new RM(T);
}
function E8(T) {
  return vHT(T);
}
function m9(T) {
  return jHT(T);
}
function rn(T, R, a) {
  return $HT.call(T, R, a);
}
function ot(T, R, a) {
  rn(rn(T, R, a), void 0, q3T);
}
function jbT(T, R) {
  ot(T, R);
}
function SbT(T, R) {
  ot(T, void 0, R);
}
function hc(T, R, a) {
  return rn(T, R, a);
}
function vk(T) {
  rn(T, void 0, q3T);
}
function gU(T, R, a) {
  if (typeof T != "function") throw TypeError("Argument is not a function");
  return Function.prototype.apply.call(T, R, a);
}
function Em(T, R, a) {
  try {
    return E8(gU(T, R, a));
  } catch (e) {
    return m9(e);
  }
}
class Dh {
  constructor() {
    this._cursor = 0, this._size = 0, this._front = {
      _elements: [],
      _next: void 0
    }, this._back = this._front, this._cursor = 0, this._size = 0;
  }
  get length() {
    return this._size;
  }
  push(T) {
    let R = this._back,
      a = R;
    R._elements.length === 16383 && (a = {
      _elements: [],
      _next: void 0
    }), R._elements.push(T), a !== R && (this._back = a, R._next = a), ++this._size;
  }
  shift() {
    let T = this._front,
      R = T,
      a = this._cursor,
      e = a + 1,
      t = T._elements,
      r = t[a];
    return e === 16384 && (R = T._next, e = 0), --this._size, this._cursor = e, T !== R && (this._front = R), t[a] = void 0, r;
  }
  forEach(T) {
    let R = this._cursor,
      a = this._front,
      e = a._elements;
    for (; !(R === e.length && a._next === void 0 || R === e.length && (a = a._next, e = a._elements, R = 0, e.length === 0));) T(e[R]), ++R;
  }
  peek() {
    let T = this._front,
      R = this._cursor;
    return T._elements[R];
  }
}