// Module: buffer
// Original: EPR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: EpR (CJS)
(T, R) => {
  var a = mN(),
    {
      CHAR_ASTERISK: e,
      CHAR_AT: t,
      CHAR_BACKWARD_SLASH: r,
      CHAR_COMMA: h,
      CHAR_DOT: i,
      CHAR_EXCLAMATION_MARK: c,
      CHAR_FORWARD_SLASH: s,
      CHAR_LEFT_CURLY_BRACE: A,
      CHAR_LEFT_PARENTHESES: l,
      CHAR_LEFT_SQUARE_BRACKET: o,
      CHAR_PLUS: n,
      CHAR_QUESTION_MARK: p,
      CHAR_RIGHT_CURLY_BRACE: _,
      CHAR_RIGHT_PARENTHESES: m,
      CHAR_RIGHT_SQUARE_BRACKET: b,
    } = bN(),
    y = (k) => {
      return k === s || k === r;
    },
    u = (k) => {
      if (k.isPrefix !== !0) k.depth = k.isGlobstar ? 1 / 0 : 1;
    },
    P = (k, x) => {
      let f = x || {},
        v = k.length - 1,
        g = f.parts === !0 || f.scanToEnd === !0,
        I = [],
        S = [],
        O = [],
        j = k,
        d = -1,
        C = 0,
        L = 0,
        w = !1,
        D = !1,
        B = !1,
        M = !1,
        V = !1,
        Q = !1,
        W = !1,
        eT = !1,
        iT = !1,
        aT = !1,
        oT = 0,
        TT,
        tT,
        lT = { value: "", depth: 0, isGlob: !1 },
        N = () => d >= v,
        q = () => j.charCodeAt(d + 1),
        F = () => {
          return ((TT = tT), j.charCodeAt(++d));
        };
      while (d < v) {
        tT = F();
        let rT;
        if (tT === r) {
          if (((W = lT.backslashes = !0), (tT = F()), tT === A)) Q = !0;
          continue;
        }
        if (Q === !0 || tT === A) {
          oT++;
          while (N() !== !0 && (tT = F())) {
            if (tT === r) {
              ((W = lT.backslashes = !0), F());
              continue;
            }
            if (tT === A) {
              oT++;
              continue;
            }
            if (Q !== !0 && tT === i && (tT = F()) === i) {
              if (
                ((w = lT.isBrace = !0),
                (B = lT.isGlob = !0),
                (aT = !0),
                g === !0)
              )
                continue;
              break;
            }
            if (Q !== !0 && tT === h) {
              if (
                ((w = lT.isBrace = !0),
                (B = lT.isGlob = !0),
                (aT = !0),
                g === !0)
              )
                continue;
              break;
            }
            if (tT === _) {
              if ((oT--, oT === 0)) {
                ((Q = !1), (w = lT.isBrace = !0), (aT = !0));
                break;
              }
            }
          }
          if (g === !0) continue;
          break;
        }
        if (tT === s) {
          if (
            (I.push(d),
            S.push(lT),
            (lT = { value: "", depth: 0, isGlob: !1 }),
            aT === !0)
          )
            continue;
          if (TT === i && d === C + 1) {
            C += 2;
            continue;
          }
          L = d + 1;
          continue;
        }
        if (f.noext !== !0) {
          if (
            (tT === n || tT === t || tT === e || tT === p || tT === c) === !0 &&
            q() === l
          ) {
            if (
              ((B = lT.isGlob = !0),
              (M = lT.isExtglob = !0),
              (aT = !0),
              tT === c && d === C)
            )
              iT = !0;
            if (g === !0) {
              while (N() !== !0 && (tT = F())) {
                if (tT === r) {
                  ((W = lT.backslashes = !0), (tT = F()));
                  continue;
                }
                if (tT === m) {
                  ((B = lT.isGlob = !0), (aT = !0));
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (tT === e) {
          if (TT === e) V = lT.isGlobstar = !0;
          if (((B = lT.isGlob = !0), (aT = !0), g === !0)) continue;
          break;
        }
        if (tT === p) {
          if (((B = lT.isGlob = !0), (aT = !0), g === !0)) continue;
          break;
        }
        if (tT === o) {
          while (N() !== !0 && (rT = F())) {
            if (rT === r) {
              ((W = lT.backslashes = !0), F());
              continue;
            }
            if (rT === b) {
              ((D = lT.isBracket = !0), (B = lT.isGlob = !0), (aT = !0));
              break;
            }
          }
          if (g === !0) continue;
          break;
        }
        if (f.nonegate !== !0 && tT === c && d === C) {
          ((eT = lT.negated = !0), C++);
          continue;
        }
        if (f.noparen !== !0 && tT === l) {
          if (((B = lT.isGlob = !0), g === !0)) {
            while (N() !== !0 && (tT = F())) {
              if (tT === l) {
                ((W = lT.backslashes = !0), (tT = F()));
                continue;
              }
              if (tT === m) {
                aT = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (B === !0) {
          if (((aT = !0), g === !0)) continue;
          break;
        }
      }
      if (f.noext === !0) ((M = !1), (B = !1));
      let E = j,
        U = "",
        Z = "";
      if (C > 0) ((U = j.slice(0, C)), (j = j.slice(C)), (L -= C));
      if (E && B === !0 && L > 0) ((E = j.slice(0, L)), (Z = j.slice(L)));
      else if (B === !0) ((E = ""), (Z = j));
      else E = j;
      if (E && E !== "" && E !== "/" && E !== j) {
        if (y(E.charCodeAt(E.length - 1))) E = E.slice(0, -1);
      }
      if (f.unescape === !0) {
        if (Z) Z = a.removeBackslashes(Z);
        if (E && W === !0) E = a.removeBackslashes(E);
      }
      let X = {
        prefix: U,
        input: k,
        start: C,
        base: E,
        glob: Z,
        isBrace: w,
        isBracket: D,
        isGlob: B,
        isExtglob: M,
        isGlobstar: V,
        negated: eT,
        negatedExtglob: iT,
      };
      if (f.tokens === !0) {
        if (((X.maxDepth = 0), !y(tT))) S.push(lT);
        X.tokens = S;
      }
      if (f.parts === !0 || f.tokens === !0) {
        let rT;
        for (let hT = 0; hT < I.length; hT++) {
          let pT = rT ? rT + 1 : C,
            mT = I[hT],
            yT = k.slice(pT, mT);
          if (f.tokens) {
            if (hT === 0 && C !== 0) ((S[hT].isPrefix = !0), (S[hT].value = U));
            else S[hT].value = yT;
            (u(S[hT]), (X.maxDepth += S[hT].depth));
          }
          if (hT !== 0 || yT !== "") O.push(yT);
          rT = mT;
        }
        if (rT && rT + 1 < k.length) {
          let hT = k.slice(rT + 1);
          if ((O.push(hT), f.tokens))
            ((S[S.length - 1].value = hT),
              u(S[S.length - 1]),
              (X.maxDepth += S[S.length - 1].depth));
        }
        ((X.slashes = I), (X.parts = O));
      }
      return X;
    };
  R.exports = P;
};
