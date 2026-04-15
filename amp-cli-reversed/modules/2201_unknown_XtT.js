function lYT(T, R) {
  for (let a = T.attrs.length - 1; a >= 0; a--) if (T.attrs[a].name === R) return T.attrs[a].value;
  return null;
}
function Pf0(T) {
  var R;
  if (T >= 55296 && T <= 57343 || T > 1114111) return 65533;
  return (R = uf0.get(T)) !== null && R !== void 0 ? R : T;
}
function WY(T) {
  return T >= Pe.ZERO && T <= Pe.NINE;
}
function xf0(T) {
  return T >= Pe.UPPER_A && T <= Pe.UPPER_F || T >= Pe.LOWER_A && T <= Pe.LOWER_F;
}
function ff0(T) {
  return T >= Pe.UPPER_A && T <= Pe.UPPER_Z || T >= Pe.LOWER_A && T <= Pe.LOWER_Z || WY(T);
}
function If0(T) {
  return T === Pe.EQUALS || ff0(T);
}
class XtT {
  constructor(T, R, a) {
    this.decodeTree = T, this.emitCodePoint = R, this.errors = a, this.state = oe.EntityStart, this.consumed = 1, this.result = 0, this.treeIndex = 0, this.excess = 1, this.decodeMode = Fo.Strict;
  }
  startEntity(T) {
    this.decodeMode = T, this.state = oe.EntityStart, this.result = 0, this.treeIndex = 0, this.excess = 1, this.consumed = 1;
  }
  write(T, R) {
    switch (this.state) {
      case oe.EntityStart:
        {
          if (T.charCodeAt(R) === Pe.NUM) return this.state = oe.NumericStart, this.consumed += 1, this.stateNumericStart(T, R + 1);
          return this.state = oe.NamedEntity, this.stateNamedEntity(T, R);
        }
      case oe.NumericStart:
        return this.stateNumericStart(T, R);
      case oe.NumericDecimal:
        return this.stateNumericDecimal(T, R);
      case oe.NumericHex:
        return this.stateNumericHex(T, R);
      case oe.NamedEntity:
        return this.stateNamedEntity(T, R);
    }
  }
  stateNumericStart(T, R) {
    if (R >= T.length) return -1;
    if ((T.charCodeAt(R) | kf0) === Pe.LOWER_X) return this.state = oe.NumericHex, this.consumed += 1, this.stateNumericHex(T, R + 1);
    return this.state = oe.NumericDecimal, this.stateNumericDecimal(T, R);
  }
  addToNumericResult(T, R, a, e) {
    if (R !== a) {
      let t = a - R;
      this.result = this.result * Math.pow(e, t) + parseInt(T.substr(R, t), e), this.consumed += t;
    }
  }
  stateNumericHex(T, R) {
    let a = R;
    while (R < T.length) {
      let e = T.charCodeAt(R);
      if (WY(e) || xf0(e)) R += 1;else return this.addToNumericResult(T, a, R, 16), this.emitNumericEntity(e, 3);
    }
    return this.addToNumericResult(T, a, R, 16), -1;
  }
  stateNumericDecimal(T, R) {
    let a = R;
    while (R < T.length) {
      let e = T.charCodeAt(R);
      if (WY(e)) R += 1;else return this.addToNumericResult(T, a, R, 10), this.emitNumericEntity(e, 2);
    }
    return this.addToNumericResult(T, a, R, 10), -1;
  }
  emitNumericEntity(T, R) {
    var a;
    if (this.consumed <= R) return (a = this.errors) === null || a === void 0 || a.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
    if (T === Pe.SEMI) this.consumed += 1;else if (this.decodeMode === Fo.Strict) return 0;
    if (this.emitCodePoint(Pf0(this.result), this.consumed), this.errors) {
      if (T !== Pe.SEMI) this.errors.missingSemicolonAfterCharacterReference();
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(T, R) {
    let {
        decodeTree: a
      } = this,
      e = a[this.treeIndex],
      t = (e & tA.VALUE_LENGTH) >> 14;
    for (; R < T.length; R++, this.excess++) {
      let r = T.charCodeAt(R);
      if (this.treeIndex = gf0(a, e, this.treeIndex + Math.max(1, t), r), this.treeIndex < 0) return this.result === 0 || this.decodeMode === Fo.Attribute && (t === 0 || If0(r)) ? 0 : this.emitNotTerminatedNamedEntity();
      if (e = a[this.treeIndex], t = (e & tA.VALUE_LENGTH) >> 14, t !== 0) {
        if (r === Pe.SEMI) return this.emitNamedEntityData(this.treeIndex, t, this.consumed + this.excess);
        if (this.decodeMode !== Fo.Strict) this.result = this.treeIndex, this.consumed += this.excess, this.excess = 0;
      }
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var T;
    let {
        result: R,
        decodeTree: a
      } = this,
      e = (a[R] & tA.VALUE_LENGTH) >> 14;
    return this.emitNamedEntityData(R, e, this.consumed), (T = this.errors) === null || T === void 0 || T.missingSemicolonAfterCharacterReference(), this.consumed;
  }
  emitNamedEntityData(T, R, a) {
    let {
      decodeTree: e
    } = this;
    if (this.emitCodePoint(R === 1 ? e[T] & ~tA.VALUE_LENGTH : e[T + 1], a), R === 3) this.emitCodePoint(e[T + 2], a);
    return a;
  }
  end() {
    var T;
    switch (this.state) {
      case oe.NamedEntity:
        return this.result !== 0 && (this.decodeMode !== Fo.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      case oe.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case oe.NumericHex:
        return this.emitNumericEntity(0, 3);
      case oe.NumericStart:
        return (T = this.errors) === null || T === void 0 || T.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
      case oe.EntityStart:
        return 0;
    }
  }
}