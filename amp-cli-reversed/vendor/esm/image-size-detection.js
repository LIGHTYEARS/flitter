// Module: image-size-detection
// Original: bmR
// Type: ESM (PT wrapper)
// Exports: $LT, $oT, A, AoT, Ct, Dj, ELT, H$, IoT, OLT, PoT, R, SLT, _oT, a, aG, boT, coT, cq, dLT, e, foT, goT, h, hoT, hq, ioT, iq, jLT, koT, l, loT, moT, noT, o, ooT, oq, r, roT, s, soT, sq, t, toT, vLT, xoT, yoT
// Category: util

// Module: bmR (ESM)
() => {
  (($LT = new TextDecoder()),
    (vLT = {
      readUInt16BE: qD,
      readUInt16LE: rr,
      readUInt32BE: se,
      readUInt32LE: Up,
    }),
    (toT = {
      validate: (T) => V8(T, 0, 2) === "BM",
      calculate: (T) => ({ height: Math.abs(JbR(T, 22)), width: Up(T, 18) }),
    }),
    (hq = {
      validate(T) {
        let R = rr(T, 0),
          a = rr(T, 4);
        if (R !== 0 || a === 0) return !1;
        return rr(T, 2) === TmR;
      },
      calculate(T) {
        let R = rr(T, 4),
          a = RoT(T, 0);
        if (R === 1) return a;
        let e = [];
        for (let t = 0; t < R; t += 1) e.push(RoT(T, t));
        return { width: a.width, height: a.height, images: e };
      },
    }),
    (roT = {
      validate(T) {
        let R = rr(T, 0),
          a = rr(T, 4);
        if (R !== 0 || a === 0) return !1;
        return rr(T, 2) === emR;
      },
      calculate: (T) => hq.calculate(T),
    }),
    (hoT = {
      validate: (T) => Up(T, 0) === 542327876,
      calculate: (T) => ({ height: Up(T, 12), width: Up(T, 16) }),
    }),
    (ioT = /^GIF8[79]a/),
    (coT = {
      validate: (T) => ioT.test(V8(T, 0, 6)),
      calculate: (T) => ({ height: rr(T, 8), width: rr(T, 6) }),
    }),
    (soT = {
      avif: "avif",
      mif1: "heif",
      msf1: "heif",
      heic: "heic",
      heix: "heic",
      hevc: "heic",
      hevx: "heic",
    }),
    (ooT = {
      validate(T) {
        if (V8(T, 4, 8) !== "ftyp") return !1;
        let R = Jh(T, "ftyp", 0);
        if (!R) return !1;
        return V8(T, R.offset + 8, R.offset + 12) in soT;
      },
      calculate(T) {
        let R = Jh(T, "meta", 0),
          a = R && Jh(T, "iprp", R.offset + 12),
          e = a && Jh(T, "ipco", a.offset + 8);
        if (!e) throw TypeError("Invalid HEIF, no ipco box found");
        let t = V8(T, 8, 12),
          r = [],
          h = e.offset + 8;
        while (h < e.offset + e.size) {
          let i = Jh(T, "ispe", h);
          if (!i) break;
          let c = se(T, i.offset + 12),
            s = se(T, i.offset + 16),
            A = Jh(T, "clap", h),
            l = c,
            o = s;
          if (A && A.offset < e.offset + e.size) {
            let n = se(T, A.offset + 12);
            l = c - n;
          }
          (r.push({ height: o, width: l }), (h = i.offset + i.size));
        }
        if (r.length === 0) throw TypeError("Invalid HEIF, no sizes found");
        return {
          width: r[0].width,
          height: r[0].height,
          type: t,
          ...(r.length > 1 ? { images: r } : {}),
        };
      },
    }),
    (jLT = {
      ICON: 32,
      "ICN#": 32,
      "icm#": 16,
      icm4: 16,
      icm8: 16,
      "ics#": 16,
      ics4: 16,
      ics8: 16,
      is32: 16,
      s8mk: 16,
      icp4: 16,
      icl4: 32,
      icl8: 32,
      il32: 32,
      l8mk: 32,
      icp5: 32,
      ic11: 32,
      ich4: 48,
      ich8: 48,
      ih32: 48,
      h8mk: 48,
      icp6: 64,
      ic12: 32,
      it32: 128,
      t8mk: 128,
      ic07: 128,
      ic08: 256,
      ic13: 256,
      ic09: 512,
      ic14: 512,
      ic10: 1024,
    }),
    (noT = {
      validate: (T) => V8(T, 0, 4) === "icns",
      calculate(T) {
        let R = T.length,
          a = se(T, rmR),
          e = tmR,
          t = [];
        while (e < a && e < R) {
          let r = jbR(T, e),
            h = SbR(r[0]);
          (t.push(h), (e += r[1]));
        }
        if (t.length === 0) throw TypeError("Invalid ICNS, no sizes found");
        return {
          width: t[0].width,
          height: t[0].height,
          ...(t.length > 1 ? { images: t } : {}),
        };
      },
    }),
    (loT = {
      validate: (T) => se(T, 0) === 4283432785,
      calculate: (T) => ({ height: se(T, 12), width: se(T, 8) }),
    }),
    (AoT = {
      validate(T) {
        if (V8(T, 4, 8) !== "jP  ") return !1;
        let R = Jh(T, "ftyp", 0);
        if (!R) return !1;
        return V8(T, R.offset + 8, R.offset + 12) === "jp2 ";
      },
      calculate(T) {
        let R = Jh(T, "jp2h", 0),
          a = R && Jh(T, "ihdr", R.offset + 8);
        if (a)
          return { height: se(T, a.offset + 8), width: se(T, a.offset + 12) };
        throw TypeError("Unsupported JPEG 2000 format");
      },
    }),
    (_oT = {
      validate: (T) => Qy(T, 0, 2) === "ffd8",
      calculate(T) {
        let R = T.slice(4),
          a,
          e;
        while (R.length) {
          let t = qD(R, 0);
          if ((LbR(R, t), R[t] !== 255)) {
            R = R.slice(1);
            continue;
          }
          if (ObR(R)) a = CbR(R, t);
          if (((e = R[t + 1]), e === 192 || e === 193 || e === 194)) {
            let r = dbR(R, t + 5);
            if (!a) return r;
            return { height: r.height, orientation: a, width: r.width };
          }
          R = R.slice(t + 2);
        }
        throw TypeError("Invalid JPG, no size found");
      },
    }),
    (iq = {
      validate: (T) => {
        return Qy(T, 0, 2) === "ff0a";
      },
      calculate(T) {
        let R = new AmR(T, "little-endian"),
          a = R.getBits(1) === 1,
          e = ILT(R, a),
          t = R.getBits(3);
        return { width: MbR(R, a, t, e), height: e };
      },
    }),
    (boT = {
      validate: (T) => {
        if (V8(T, 4, 8) !== "JXL ") return !1;
        let R = Jh(T, "ftyp", 0);
        if (!R) return !1;
        return V8(T, R.offset + 8, R.offset + 12) === "jxl ";
      },
      calculate(T) {
        let R = DbR(T);
        if (R) return iq.calculate(R);
        throw Error("No codestream found in JXL container");
      },
    }),
    (moT = {
      validate: (T) => {
        let R = V8(T, 1, 7);
        return ["KTX 11", "KTX 20"].includes(R);
      },
      calculate: (T) => {
        let R = T[5] === 49 ? "ktx" : "ktx2",
          a = R === "ktx" ? 36 : 20;
        return { height: Up(T, a + 4), width: Up(T, a), type: R };
      },
    }),
    (yoT = {
      validate(T) {
        if (pmR === V8(T, 1, 8)) {
          let R = V8(T, 12, 16);
          if (R === uoT) R = V8(T, 28, 32);
          if (R !== _mR) throw TypeError("Invalid PNG");
          return !0;
        }
        return !1;
      },
      calculate(T) {
        if (V8(T, 12, 16) === uoT)
          return { height: se(T, 36), width: se(T, 32) };
        return { height: se(T, 20), width: se(T, 16) };
      },
    }),
    (cq = {
      P1: "pbm/ascii",
      P2: "pgm/ascii",
      P3: "ppm/ascii",
      P4: "pbm",
      P5: "pgm",
      P6: "ppm",
      P7: "pam",
      PF: "pfm",
    }),
    (sq = {
      default: (T) => {
        let R = [];
        while (T.length > 0) {
          let a = T.shift();
          if (a[0] === "#") continue;
          R = a.split(" ");
          break;
        }
        if (R.length === 2)
          return {
            height: Number.parseInt(R[1], 10),
            width: Number.parseInt(R[0], 10),
          };
        throw TypeError("Invalid PNM");
      },
      pam: (T) => {
        let R = {};
        while (T.length > 0) {
          let a = T.shift();
          if (a.length > 16 || a.charCodeAt(0) > 128) continue;
          let [e, t] = a.split(" ");
          if (e && t) R[e.toLowerCase()] = Number.parseInt(t, 10);
          if (R.height && R.width) break;
        }
        if (R.height && R.width) return { height: R.height, width: R.width };
        throw TypeError("Invalid PAM");
      },
    }),
    (PoT = {
      validate: (T) => V8(T, 0, 2) in cq,
      calculate(T) {
        let R = V8(T, 0, 2),
          a = cq[R],
          e = V8(T, 3).split(/[\r\n]+/);
        return (sq[a] || sq.default)(e);
      },
    }),
    (koT = {
      validate: (T) => V8(T, 0, 4) === "8BPS",
      calculate: (T) => ({ height: se(T, 14), width: se(T, 18) }),
    }),
    (oq = /<svg\s([^>"']|"[^"]*"|'[^']*')*>/),
    (H$ = {
      height: /\sheight=(['"])([^%]+?)\1/,
      root: oq,
      viewbox: /\sviewBox=(['"])(.+?)\1/i,
      width: /\swidth=(['"])([^%]+?)\1/,
    }),
    (aG = {
      in: 96,
      cm: 96 / nq,
      em: 16,
      ex: 8,
      m: (96 / nq) * 100,
      mm: 96 / nq / 10,
      pc: 0.1111111111111111,
      pt: 1.3333333333333333,
      px: 1,
    }),
    (SLT = new RegExp(`^([0-9.]+(?:e\\d+)?)(${Object.keys(aG).join("|")})?$`)),
    (xoT = {
      validate: (T) => oq.test(V8(T, 0, 1000)),
      calculate(T) {
        let R = V8(T).match(H$.root);
        if (R) {
          let a = UbR(R[0]);
          if (a.width && a.height) return HbR(a);
          if (a.viewbox) return WbR(a, a.viewbox);
        }
        throw TypeError("Invalid SVG");
      },
    }),
    (foT = {
      validate(T) {
        return rr(T, 0) === 0 && rr(T, 4) === 0;
      },
      calculate(T) {
        return { height: rr(T, 14), width: rr(T, 12) };
      },
    }),
    (Ct = {
      TAG: { WIDTH: 256, HEIGHT: 257, COMPRESSION: 259 },
      TYPE: { SHORT: 3, LONG: 4, LONG8: 16 },
      ENTRY_SIZE: { STANDARD: 12, BIG: 20 },
      COUNT_SIZE: { STANDARD: 2, BIG: 8 },
    }),
    (IoT = new Set(["49492a00", "4d4d002a", "49492b00", "4d4d002b"])),
    (goT = {
      validate: (T) => {
        let R = Qy(T, 0, 4);
        return IoT.has(R);
      },
      calculate(T) {
        let R = KbR(T);
        if (R.isBigTiff) VbR(T, R.isBigEndian);
        let a = qbR(T, R),
          e = GbR(a, R),
          t = {
            height: e[Ct.TAG.HEIGHT],
            width: e[Ct.TAG.WIDTH],
            type: R.isBigTiff ? "bigtiff" : "tiff",
          };
        if (e[Ct.TAG.COMPRESSION]) t.compression = e[Ct.TAG.COMPRESSION];
        if (!t.width || !t.height)
          throw TypeError("Invalid Tiff. Missing tags");
        return t;
      },
    }),
    ($oT = {
      validate(T) {
        let R = V8(T, 0, 4) === "RIFF",
          a = V8(T, 8, 12) === "WEBP",
          e = V8(T, 12, 15) === "VP8";
        return R && a && e;
      },
      calculate(T) {
        let R = V8(T, 12, 16),
          a = T.slice(20, 30);
        if (R === "VP8X") {
          let t = a[0],
            r = (t & 192) === 0,
            h = (t & 1) === 0;
          if (r && h) return XbR(a);
          throw TypeError("Invalid WebP");
        }
        if (R === "VP8 " && a[0] !== 47) return QbR(a);
        let e = Qy(a, 3, 6);
        if (R === "VP8L" && e !== "9d012a") return YbR(a);
        throw TypeError("Invalid WebP");
      },
    }),
    (Dj = new Map([
      ["bmp", toT],
      ["cur", roT],
      ["dds", hoT],
      ["gif", coT],
      ["heif", ooT],
      ["icns", noT],
      ["ico", hq],
      ["j2c", loT],
      ["jp2", AoT],
      ["jpg", _oT],
      ["jxl", boT],
      ["jxl-stream", iq],
      ["ktx", moT],
      ["png", yoT],
      ["pnm", PoT],
      ["psd", koT],
      ["svg", xoT],
      ["tga", foT],
      ["tiff", goT],
      ["webp", $oT],
    ])),
    (OLT = Array.from(Dj.keys())),
    (dLT = new Map([
      [0, "heif"],
      [56, "psd"],
      [66, "bmp"],
      [68, "dds"],
      [71, "gif"],
      [73, "tiff"],
      [77, "tiff"],
      [82, "webp"],
      [105, "icns"],
      [137, "png"],
      [255, "jpg"],
    ])),
    (ELT = { disabledTypes: [] }));
};
