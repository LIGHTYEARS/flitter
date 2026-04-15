function GXR() {
  let T = new Map();
  for (let [R, a] of Object.entries(D3)) {
    for (let [e, t] of Object.entries(a)) D3[e] = {
      open: `\x1B[${t[0]}m`,
      close: `\x1B[${t[1]}m`
    }, a[e] = D3[e], T.set(t[0], t[1]);
    Object.defineProperty(D3, R, {
      value: a,
      enumerable: !1
    });
  }
  return Object.defineProperty(D3, "codes", {
    value: T,
    enumerable: !1
  }), D3.color.close = "\x1B[39m", D3.bgColor.close = "\x1B[49m", D3.color.ansi = iyT(), D3.color.ansi256 = cyT(), D3.color.ansi16m = syT(), D3.bgColor.ansi = iyT(10), D3.bgColor.ansi256 = cyT(10), D3.bgColor.ansi16m = syT(10), Object.defineProperties(D3, {
    rgbToAnsi256: {
      value(R, a, e) {
        if (R === a && a === e) {
          if (R < 8) return 16;
          if (R > 248) return 231;
          return Math.round((R - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(R / 255 * 5) + 6 * Math.round(a / 255 * 5) + Math.round(e / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value(R) {
        let a = /[a-f\d]{6}|[a-f\d]{3}/i.exec(R.toString(16));
        if (!a) return [0, 0, 0];
        let [e] = a;
        if (e.length === 3) e = [...e].map(r => r + r).join("");
        let t = Number.parseInt(e, 16);
        return [t >> 16 & 255, t >> 8 & 255, t & 255];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: R => D3.rgbToAnsi256(...D3.hexToRgb(R)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value(R) {
        if (R < 8) return 30 + R;
        if (R < 16) return 90 + (R - 8);
        let a, e, t;
        if (R >= 232) a = ((R - 232) * 10 + 8) / 255, e = a, t = a;else {
          R -= 16;
          let i = R % 36;
          a = Math.floor(R / 36) / 5, e = Math.floor(i / 6) / 5, t = i % 6 / 5;
        }
        let r = Math.max(a, e, t) * 2;
        if (r === 0) return 30;
        let h = 30 + (Math.round(t) << 2 | Math.round(e) << 1 | Math.round(a));
        if (r === 2) h += 60;
        return h;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: (R, a, e) => D3.ansi256ToAnsi(D3.rgbToAnsi256(R, a, e)),
      enumerable: !1
    },
    hexToAnsi: {
      value: R => D3.ansi256ToAnsi(D3.hexToAnsi256(R)),
      enumerable: !1
    }
  }), D3;
}