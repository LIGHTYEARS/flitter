function kQ(T) {
  return T >= F3.ZERO && T <= F3.NINE;
}
function E70(T) {
  return T >= F3.UPPER_A && T <= F3.UPPER_F || T >= F3.LOWER_A && T <= F3.LOWER_F;
}
function C70(T) {
  return T >= F3.UPPER_A && T <= F3.UPPER_Z || T >= F3.LOWER_A && T <= F3.LOWER_Z || kQ(T);
}
function L70(T) {
  return T === F3.EQUALS || C70(T);
}
class TTR {
  constructor(T, R, a) {
    this.decodeTree = T, this.emitCodePoint = R, this.errors = a, this.state = ne.EntityStart, this.consumed = 1, this.result = 0, this.treeIndex = 0, this.excess = 1, this.decodeMode = Go.Strict;
  }
  startEntity(T) {
    this.decodeMode = T, this.state = ne.EntityStart, this.result = 0, this.treeIndex = 0, this.excess = 1, this.consumed = 1;
  }
  write(T, R) {
    switch (this.state) {
      case ne.EntityStart:
        {
          if (T.charCodeAt(R) === F3.NUM) return this.state = ne.NumericStart, this.consumed += 1, this.stateNumericStart(T, R + 1);
          return this.state = ne.NamedEntity, this.stateNamedEntity(T, R);
        }
      case ne.NumericStart:
        return this.stateNumericStart(T, R);
      case ne.NumericDecimal:
        return this.stateNumericDecimal(T, R);
      case ne.NumericHex:
        return this.stateNumericHex(T, R);
      case ne.NamedEntity:
        return this.stateNamedEntity(T, R);
    }
  }
  stateNumericStart(T, R) {
    if (R >= T.length) return -1;
    if ((T.charCodeAt(R) | QIT) === F3.LOWER_X) return this.state = ne.NumericHex, this.consumed += 1, this.stateNumericHex(T, R + 1);
    return this.state = ne.NumericDecimal, this.stateNumericDecimal(T, R);
  }
  stateNumericHex(T, R) {
    while (R < T.length) {
      let a = T.charCodeAt(R);
      if (kQ(a) || E70(a)) {
        let e = a <= F3.NINE ? a - F3.ZERO : (a | QIT) - F3.LOWER_A + 10;
        this.result = this.result * 16 + e, this.consumed++, R++;
      } else return this.emitNumericEntity(a, 3);
    }
    return -1;
  }
  stateNumericDecimal(T, R) {
    while (R < T.length) {
      let a = T.charCodeAt(R);
      if (kQ(a)) this.result = this.result * 10 + (a - F3.ZERO), this.consumed++, R++;else return this.emitNumericEntity(a, 2);
    }
    return -1;
  }
  emitNumericEntity(T, R) {
    var a;
    if (this.consumed <= R) return (a = this.errors) === null || a === void 0 || a.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
    if (T === F3.SEMI) this.consumed += 1;else if (this.decodeMode === Go.Strict) return 0;
    if (this.emitCodePoint(S70(this.result), this.consumed), this.errors) {
      if (T !== F3.SEMI) this.errors.missingSemicolonAfterCharacterReference();
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(T, R) {
    let {
        decodeTree: a
      } = this,
      e = a[this.treeIndex],
      t = (e & jt.VALUE_LENGTH) >> 14;
    while (R < T.length) {
      if (t === 0 && (e & jt.FLAG13) !== 0) {
        let h = (e & jt.BRANCH_LENGTH) >> 7,
          i = e & jt.JUMP_TABLE;
        if (R + h > T.length) return -1;
        if (T.charCodeAt(R) !== i) return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
        R++, this.excess++;
        let c = h - 1;
        for (let s = 1; s < h; s += 2) {
          let A = a[this.treeIndex + 1 + (s - 1 >> 1)],
            l = A & 255;
          if (T.charCodeAt(R) !== l) return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
          R++, this.excess++;
          let o = A >> 8 & 255;
          if (s + 1 < h) {
            if (T.charCodeAt(R) !== o) return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
            R++, this.excess++;
          }
        }
        this.treeIndex += 1 + (c + 1 >> 1), e = a[this.treeIndex], t = (e & jt.VALUE_LENGTH) >> 14;
      }
      if (R >= T.length) break;
      let r = T.charCodeAt(R);
      if (r === F3.SEMI && t !== 0 && (e & jt.FLAG13) !== 0) return this.emitNamedEntityData(this.treeIndex, t, this.consumed + this.excess);
      if (this.treeIndex = M70(a, e, this.treeIndex + Math.max(1, t), r), this.treeIndex < 0) return this.result === 0 || this.decodeMode === Go.Attribute && (t === 0 || L70(r)) ? 0 : this.emitNotTerminatedNamedEntity();
      if (e = a[this.treeIndex], t = (e & jt.VALUE_LENGTH) >> 14, t !== 0) {
        if (r === F3.SEMI) return this.emitNamedEntityData(this.treeIndex, t, this.consumed + this.excess);
        if (this.decodeMode !== Go.Strict && (e & jt.FLAG13) === 0) this.result = this.treeIndex, this.consumed += this.excess, this.excess = 0;
      }
      R++, this.excess++;
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var T;
    let {
        result: R,
        decodeTree: a
      } = this,
      e = (a[R] & jt.VALUE_LENGTH) >> 14;
    return this.emitNamedEntityData(R, e, this.consumed), (T = this.errors) === null || T === void 0 || T.missingSemicolonAfterCharacterReference(), this.consumed;
  }
  emitNamedEntityData(T, R, a) {
    let {
      decodeTree: e
    } = this;
    if (this.emitCodePoint(R === 1 ? e[T] & ~(jt.VALUE_LENGTH | jt.FLAG13) : e[T + 1], a), R === 3) this.emitCodePoint(e[T + 2], a);
    return a;
  }
  end() {
    var T;
    switch (this.state) {
      case ne.NamedEntity:
        return this.result !== 0 && (this.decodeMode !== Go.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      case ne.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case ne.NumericHex:
        return this.emitNumericEntity(0, 3);
      case ne.NumericStart:
        return (T = this.errors) === null || T === void 0 || T.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
      case ne.EntityStart:
        return 0;
    }
  }
}