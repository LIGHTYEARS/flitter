function I2T(T) {
  if (T < 4) {
    if (T < 2) {
      if (T === 0) return "";else {
        let R = L0[CR++];
        if ((R & 128) > 1) {
          CR -= 1;
          return;
        }
        return le(R);
      }
    } else {
      let R = L0[CR++],
        a = L0[CR++];
      if ((R & 128) > 0 || (a & 128) > 0) {
        CR -= 2;
        return;
      }
      if (T < 3) return le(R, a);
      let e = L0[CR++];
      if ((e & 128) > 0) {
        CR -= 3;
        return;
      }
      return le(R, a, e);
    }
  } else {
    let R = L0[CR++],
      a = L0[CR++],
      e = L0[CR++],
      t = L0[CR++];
    if ((R & 128) > 0 || (a & 128) > 0 || (e & 128) > 0 || (t & 128) > 0) {
      CR -= 4;
      return;
    }
    if (T < 6) {
      if (T === 4) return le(R, a, e, t);else {
        let r = L0[CR++];
        if ((r & 128) > 0) {
          CR -= 5;
          return;
        }
        return le(R, a, e, t, r);
      }
    } else if (T < 8) {
      let r = L0[CR++],
        h = L0[CR++];
      if ((r & 128) > 0 || (h & 128) > 0) {
        CR -= 6;
        return;
      }
      if (T < 7) return le(R, a, e, t, r, h);
      let i = L0[CR++];
      if ((i & 128) > 0) {
        CR -= 7;
        return;
      }
      return le(R, a, e, t, r, h, i);
    } else {
      let r = L0[CR++],
        h = L0[CR++],
        i = L0[CR++],
        c = L0[CR++];
      if ((r & 128) > 0 || (h & 128) > 0 || (i & 128) > 0 || (c & 128) > 0) {
        CR -= 8;
        return;
      }
      if (T < 10) {
        if (T === 8) return le(R, a, e, t, r, h, i, c);else {
          let s = L0[CR++];
          if ((s & 128) > 0) {
            CR -= 9;
            return;
          }
          return le(R, a, e, t, r, h, i, c, s);
        }
      } else if (T < 12) {
        let s = L0[CR++],
          A = L0[CR++];
        if ((s & 128) > 0 || (A & 128) > 0) {
          CR -= 10;
          return;
        }
        if (T < 11) return le(R, a, e, t, r, h, i, c, s, A);
        let l = L0[CR++];
        if ((l & 128) > 0) {
          CR -= 11;
          return;
        }
        return le(R, a, e, t, r, h, i, c, s, A, l);
      } else {
        let s = L0[CR++],
          A = L0[CR++],
          l = L0[CR++],
          o = L0[CR++];
        if ((s & 128) > 0 || (A & 128) > 0 || (l & 128) > 0 || (o & 128) > 0) {
          CR -= 12;
          return;
        }
        if (T < 14) {
          if (T === 12) return le(R, a, e, t, r, h, i, c, s, A, l, o);else {
            let n = L0[CR++];
            if ((n & 128) > 0) {
              CR -= 13;
              return;
            }
            return le(R, a, e, t, r, h, i, c, s, A, l, o, n);
          }
        } else {
          let n = L0[CR++],
            p = L0[CR++];
          if ((n & 128) > 0 || (p & 128) > 0) {
            CR -= 14;
            return;
          }
          if (T < 15) return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p);
          let _ = L0[CR++];
          if ((_ & 128) > 0) {
            CR -= 15;
            return;
          }
          return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p, _);
        }
      }
    }
  }
}