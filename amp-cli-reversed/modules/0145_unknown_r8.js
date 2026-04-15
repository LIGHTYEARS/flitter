function r8() {
  let T = L0[CR++],
    R = T >> 5;
  if (T = T & 31, T > 23) switch (T) {
    case 24:
      T = L0[CR++];
      break;
    case 25:
      if (R == 7) return a00();
      T = St.getUint16(CR), CR += 2;
      break;
    case 26:
      if (R == 7) {
        let a = St.getFloat32(CR);
        if (R8.useFloat32 > 2) {
          let e = heT[(L0[CR] & 127) << 1 | L0[CR + 1] >> 7];
          return CR += 4, (e * a + (a > 0 ? 0.5 : -0.5) >> 0) / e;
        }
        return CR += 4, a;
      }
      if (T = St.getUint32(CR), CR += 4, R === 1) return -1 - T;
      break;
    case 27:
      if (R == 7) {
        let a = St.getFloat64(CR);
        return CR += 8, a;
      }
      if (R > 1) {
        if (St.getUint32(CR) > 0) throw Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
        T = St.getUint32(CR + 4);
      } else if (R8.int64AsNumber) T = St.getUint32(CR) * 4294967296, T += St.getUint32(CR + 4);else T = St.getBigUint64(CR);
      CR += 8;
      break;
    case 31:
      switch (R) {
        case 2:
        case 3:
          throw Error("Indefinite length not supported for byte or text strings");
        case 4:
          let a = [],
            e,
            t = 0;
          while ((e = r8()) != Zu) {
            if (t >= GI) throw Error(`Array length exceeds ${GI}`);
            a[t++] = e;
          }
          return R == 4 ? a : R == 3 ? a.join("") : Buffer.concat(a);
        case 5:
          let r;
          if (R8.mapsAsObjects) {
            let h = {},
              i = 0;
            if (R8.keyMap) while ((r = r8()) != Zu) {
              if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
              h[ii(R8.decodeKey(r))] = r8();
            } else while ((r = r8()) != Zu) {
              if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
              h[ii(r)] = r8();
            }
            return h;
          } else {
            if (_$) R8.mapsAsObjects = !0, _$ = !1;
            let h = new Map();
            if (R8.keyMap) {
              let i = 0;
              while ((r = r8()) != Zu) {
                if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                h.set(R8.decodeKey(r), r8());
              }
            } else {
              let i = 0;
              while ((r = r8()) != Zu) {
                if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                h.set(r, r8());
              }
            }
            return h;
          }
        case 7:
          return Zu;
        default:
          throw Error("Invalid major type for indefinite length " + R);
      }
    default:
      throw Error("Unknown token " + T);
  }
  switch (R) {
    case 0:
      return T;
    case 1:
      return ~T;
    case 2:
      return R00(T);
    case 3:
      if (zb >= CR) return rS.slice(CR - hS, (CR += T) - hS);
      if (zb == 0 && _A < 140 && T < 32) {
        let t = T < 16 ? I2T(T) : T00(T);
        if (t != null) return t;
      }
      return f2T(T);
    case 4:
      if (T >= GI) throw Error(`Array length exceeds ${GI}`);
      let a = Array(T);
      for (let t = 0; t < T; t++) a[t] = r8();
      return a;
    case 5:
      if (T >= Io) throw Error(`Map size exceeds ${GI}`);
      if (R8.mapsAsObjects) {
        let t = {};
        if (R8.keyMap) for (let r = 0; r < T; r++) t[ii(R8.decodeKey(r8()))] = r8();else for (let r = 0; r < T; r++) t[ii(r8())] = r8();
        return t;
      } else {
        if (_$) R8.mapsAsObjects = !0, _$ = !1;
        let t = new Map();
        if (R8.keyMap) for (let r = 0; r < T; r++) t.set(R8.decodeKey(r8()), r8());else for (let r = 0; r < T; r++) t.set(r8(), r8());
        return t;
      }
    case 6:
      if (T >= LyT) {
        let t = ia[T & 8191];
        if (t) {
          if (!t.read) t.read = e1(t);
          return t.read();
        }
        if (T < 65536) {
          if (T == VR0) {
            let r = hP(),
              h = r8(),
              i = r8();
            t1(h, i);
            let c = {};
            if (R8.keyMap) for (let s = 2; s < r; s++) {
              let A = R8.decodeKey(i[s - 2]);
              c[ii(A)] = r8();
            } else for (let s = 2; s < r; s++) {
              let A = i[s - 2];
              c[ii(A)] = r8();
            }
            return c;
          } else if (T == KR0) {
            let r = hP(),
              h = r8();
            for (let i = 2; i < r; i++) t1(h++, r8());
            return r8();
          } else if (T == LyT) return c00();
          if (R8.getShared) {
            if (reT(), t = ia[T & 8191], t) {
              if (!t.read) t.read = e1(t);
              return t.read();
            }
          }
        }
      }
      let e = Ea[T];
      if (e) {
        if (e.handlesRead) return e(r8);else return e(r8());
      } else {
        let t = r8();
        for (let r = 0; r < a1.length; r++) {
          let h = a1[r](T, t);
          if (h !== void 0) return h;
        }
        return new OA(t, T);
      }
    case 7:
      switch (T) {
        case 20:
          return !1;
        case 21:
          return !0;
        case 22:
          return null;
        case 23:
          return;
        case 31:
        default:
          let t = (Ir || O_())[T];
          if (t !== void 0) return t;
          throw Error("Unknown token " + T);
      }
    default:
      if (isNaN(T)) {
        let t = Error("Unexpected end of CBOR data");
        throw t.incomplete = !0, t;
      }
      throw Error("Unknown CBOR token " + T);
  }
}