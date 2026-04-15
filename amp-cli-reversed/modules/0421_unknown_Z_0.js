function Z_0() {
  let T = new Map();
  for (let [R, a] of Object.entries(w3)) {
    for (let [e, t] of Object.entries(a)) w3[e] = {
      open: `\x1B[${t[0]}m`,
      close: `\x1B[${t[1]}m`
    }, a[e] = w3[e], T.set(t[0], t[1]);
    Object.defineProperty(w3, R, {
      value: a,
      enumerable: !1
    });
  }
  return Object.defineProperty(w3, "codes", {
    value: T,
    enumerable: !1
  }), w3.color.close = "\x1B[39m", w3.bgColor.close = "\x1B[49m", w3.color.ansi = ZkT(), w3.color.ansi256 = JkT(), w3.color.ansi16m = TxT(), w3.bgColor.ansi = ZkT(10), w3.bgColor.ansi256 = JkT(10), w3.bgColor.ansi16m = TxT(10), Object.defineProperties(w3, {
    rgbToAnsi256: {
      value: (R, a, e) => {
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
      value: R => {
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
      value: R => w3.rgbToAnsi256(...w3.hexToRgb(R)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value: R => {
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
      value: (R, a, e) => w3.ansi256ToAnsi(w3.rgbToAnsi256(R, a, e)),
      enumerable: !1
    },
    hexToAnsi: {
      value: R => w3.ansi256ToAnsi(w3.hexToAnsi256(R)),
      enumerable: !1
    }
  }), w3;
}