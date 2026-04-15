class tFT {
  constructor(T) {
    this.options = {
      mpegOffsetTolerance: 0,
      ...T
    }, this.detectors = [...(T?.customDetectors ?? []), {
      id: "core",
      detect: this.detectConfident
    }, {
      id: "core.imprecise",
      detect: this.detectImprecise
    }], this.tokenizerOptions = {
      abortSignal: T?.signal
    };
  }
  async fromTokenizer(T) {
    let R = T.position;
    for (let a of this.detectors) {
      let e = await a.detect(T);
      if (e) return e;
      if (R !== T.position) return;
    }
  }
  async fromBuffer(T) {
    if (!(T instanceof Uint8Array || T instanceof ArrayBuffer)) throw TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof T}\``);
    let R = T instanceof Uint8Array ? T : new Uint8Array(T);
    if (!(R?.length > 1)) return;
    return this.fromTokenizer(NKR(R, this.tokenizerOptions));
  }
  async fromBlob(T) {
    let R = UKR(T, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(R);
    } finally {
      await R.close();
    }
  }
  async fromStream(T) {
    let R = RFT(T, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(R);
    } finally {
      await R.close();
    }
  }
  async toDetectionStream(T, R) {
    let {
        sampleSize: a = lM
      } = R,
      e,
      t,
      r = T.getReader({
        mode: "byob"
      });
    try {
      let {
        value: c,
        done: s
      } = await r.read(new Uint8Array(a));
      if (t = c, !s && c) try {
        e = await this.fromBuffer(c.subarray(0, a));
      } catch (A) {
        if (!(A instanceof fe)) throw A;
        e = void 0;
      }
      t = c;
    } finally {
      r.releaseLock();
    }
    let h = new TransformStream({
        async start(c) {
          c.enqueue(t);
        },
        transform(c, s) {
          s.enqueue(c);
        }
      }),
      i = T.pipeThrough(h);
    return i.fileType = e, i;
  }
  check(T, R) {
    return Zc(this.buffer, T, R);
  }
  checkString(T, R) {
    return this.check(cVR(T, R?.encoding), R);
  }
  detectConfident = async T => {
    if (this.buffer = new Uint8Array(lM), T.fileInfo.size === void 0) T.fileInfo.size = Number.MAX_SAFE_INTEGER;
    if (this.tokenizer = T, await T.peekBuffer(this.buffer, {
      length: 32,
      mayBeLess: !0
    }), this.check([66, 77])) return {
      ext: "bmp",
      mime: "image/bmp"
    };
    if (this.check([11, 119])) return {
      ext: "ac3",
      mime: "audio/vnd.dolby.dd-raw"
    };
    if (this.check([120, 1])) return {
      ext: "dmg",
      mime: "application/x-apple-diskimage"
    };
    if (this.check([77, 90])) return {
      ext: "exe",
      mime: "application/x-msdownload"
    };
    if (this.check([37, 33])) {
      if (await T.peekBuffer(this.buffer, {
        length: 24,
        mayBeLess: !0
      }), this.checkString("PS-Adobe-", {
        offset: 2
      }) && this.checkString(" EPSF-", {
        offset: 14
      })) return {
        ext: "eps",
        mime: "application/eps"
      };
      return {
        ext: "ps",
        mime: "application/postscript"
      };
    }
    if (this.check([31, 160]) || this.check([31, 157])) return {
      ext: "Z",
      mime: "application/x-compress"
    };
    if (this.check([199, 113])) return {
      ext: "cpio",
      mime: "application/x-cpio"
    };
    if (this.check([96, 234])) return {
      ext: "arj",
      mime: "application/x-arj"
    };
    if (this.check([239, 187, 191])) return this.tokenizer.ignore(3), this.detectConfident(T);
    if (this.check([71, 73, 70])) return {
      ext: "gif",
      mime: "image/gif"
    };
    if (this.check([73, 73, 188])) return {
      ext: "jxr",
      mime: "image/vnd.ms-photo"
    };
    if (this.check([31, 139, 8])) {
      let R = new eFT(T).inflate(),
        a = !0;
      try {
        let e;
        try {
          e = await this.fromStream(R);
        } catch {
          a = !1;
        }
        if (e && e.ext === "tar") return {
          ext: "tar.gz",
          mime: "application/gzip"
        };
      } finally {
        if (a) await R.cancel();
      }
      return {
        ext: "gz",
        mime: "application/gzip"
      };
    }
    if (this.check([66, 90, 104])) return {
      ext: "bz2",
      mime: "application/x-bzip2"
    };
    if (this.checkString("ID3")) {
      await T.ignore(6);
      let R = await T.readToken(oVR);
      if (T.position + R > T.fileInfo.size) return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
      return await T.ignore(R), this.fromTokenizer(T);
    }
    if (this.checkString("MP+")) return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], {
      offset: 1
    })) return {
      ext: "swf",
      mime: "application/x-shockwave-flash"
    };
    if (this.check([255, 216, 255])) {
      if (this.check([247], {
        offset: 3
      })) return {
        ext: "jls",
        mime: "image/jls"
      };
      return {
        ext: "jpg",
        mime: "image/jpeg"
      };
    }
    if (this.check([79, 98, 106, 1])) return {
      ext: "avro",
      mime: "application/avro"
    };
    if (this.checkString("FLIF")) return {
      ext: "flif",
      mime: "image/flif"
    };
    if (this.checkString("8BPS")) return {
      ext: "psd",
      mime: "image/vnd.adobe.photoshop"
    };
    if (this.checkString("MPCK")) return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
    if (this.checkString("FORM")) return {
      ext: "aif",
      mime: "audio/aiff"
    };
    if (this.checkString("icns", {
      offset: 0
    })) return {
      ext: "icns",
      mime: "image/icns"
    };
    if (this.check([80, 75, 3, 4])) {
      let R;
      return await new NaT(T).unzip(a => {
        switch (a.filename) {
          case "META-INF/mozilla.rsa":
            return R = {
              ext: "xpi",
              mime: "application/x-xpinstall"
            }, {
              stop: !0
            };
          case "META-INF/MANIFEST.MF":
            return R = {
              ext: "jar",
              mime: "application/java-archive"
            }, {
              stop: !0
            };
          case "mimetype":
            return {
              async handler(e) {
                let t = new TextDecoder("utf-8").decode(e).trim();
                R = pz(t);
              },
              stop: !0
            };
          case "[Content_Types].xml":
            return {
              async handler(e) {
                let t = new TextDecoder("utf-8").decode(e),
                  r = t.indexOf('.main+xml"');
                if (r === -1) {
                  if (t.includes('ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"')) R = pz("application/vnd.ms-package.3dmanufacturing-3dmodel+xml");
                } else {
                  t = t.slice(0, Math.max(0, r));
                  let h = t.lastIndexOf('"'),
                    i = t.slice(Math.max(0, h + 1));
                  R = pz(i);
                }
              },
              stop: !0
            };
          default:
            if (/classes\d*\.dex/.test(a.filename)) return R = {
              ext: "apk",
              mime: "application/vnd.android.package-archive"
            }, {
              stop: !0
            };
            return {};
        }
      }).catch(a => {
        if (!(a instanceof fe)) throw a;
      }), R ?? {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("OggS")) {
      await T.ignore(28);
      let R = new Uint8Array(8);
      if (await T.readBuffer(R), Zc(R, [79, 112, 117, 115, 72, 101, 97, 100])) return {
        ext: "opus",
        mime: "audio/ogg; codecs=opus"
      };
      if (Zc(R, [128, 116, 104, 101, 111, 114, 97])) return {
        ext: "ogv",
        mime: "video/ogg"
      };
      if (Zc(R, [1, 118, 105, 100, 101, 111, 0])) return {
        ext: "ogm",
        mime: "video/ogg"
      };
      if (Zc(R, [127, 70, 76, 65, 67])) return {
        ext: "oga",
        mime: "audio/ogg"
      };
      if (Zc(R, [83, 112, 101, 101, 120, 32, 32])) return {
        ext: "spx",
        mime: "audio/ogg"
      };
      if (Zc(R, [1, 118, 111, 114, 98, 105, 115])) return {
        ext: "ogg",
        mime: "audio/ogg"
      };
      return {
        ext: "ogx",
        mime: "application/ogg"
      };
    }
    if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8)) return {
      ext: "zip",
      mime: "application/zip"
    };
    if (this.checkString("MThd")) return {
      ext: "mid",
      mime: "audio/midi"
    };
    if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], {
      offset: 4
    }) || this.checkString("OTTO", {
      offset: 4
    }))) return {
      ext: "woff",
      mime: "font/woff"
    };
    if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], {
      offset: 4
    }) || this.checkString("OTTO", {
      offset: 4
    }))) return {
      ext: "woff2",
      mime: "font/woff2"
    };
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212])) return {
      ext: "pcap",
      mime: "application/vnd.tcpdump.pcap"
    };
    if (this.checkString("DSD ")) return {
      ext: "dsf",
      mime: "audio/x-dsf"
    };
    if (this.checkString("LZIP")) return {
      ext: "lz",
      mime: "application/x-lzip"
    };
    if (this.checkString("fLaC")) return {
      ext: "flac",
      mime: "audio/flac"
    };
    if (this.check([66, 80, 71, 251])) return {
      ext: "bpg",
      mime: "image/bpg"
    };
    if (this.checkString("wvpk")) return {
      ext: "wv",
      mime: "audio/wavpack"
    };
    if (this.checkString("%PDF")) return {
      ext: "pdf",
      mime: "application/pdf"
    };
    if (this.check([0, 97, 115, 109])) return {
      ext: "wasm",
      mime: "application/wasm"
    };
    if (this.check([73, 73])) {
      let R = await this.readTiffHeader(!1);
      if (R) return R;
    }
    if (this.check([77, 77])) {
      let R = await this.readTiffHeader(!0);
      if (R) return R;
    }
    if (this.checkString("MAC ")) return {
      ext: "ape",
      mime: "audio/ape"
    };
    if (this.check([26, 69, 223, 163])) {
      async function R() {
        let r = await T.peekNumber(QKR),
          h = 128,
          i = 0;
        while ((r & h) === 0 && h !== 0) ++i, h >>= 1;
        let c = new Uint8Array(i + 1);
        return await T.readBuffer(c), c;
      }
      async function a() {
        let r = await R(),
          h = await R();
        h[0] ^= 128 >> h.length - 1;
        let i = Math.min(6, h.length),
          c = new DataView(r.buffer),
          s = new DataView(h.buffer, h.length - i, i);
        return {
          id: YuT(c),
          len: YuT(s)
        };
      }
      async function e(r) {
        while (r > 0) {
          let h = await a();
          if (h.id === 17026) return (await T.readToken(new bs(h.len))).replaceAll(/\00.*$/g, "");
          await T.ignore(h.len), --r;
        }
      }
      let t = await a();
      switch (await e(t.len)) {
        case "webm":
          return {
            ext: "webm",
            mime: "video/webm"
          };
        case "matroska":
          return {
            ext: "mkv",
            mime: "video/matroska"
          };
        default:
          return;
      }
    }
    if (this.checkString("SQLi")) return {
      ext: "sqlite",
      mime: "application/x-sqlite3"
    };
    if (this.check([78, 69, 83, 26])) return {
      ext: "nes",
      mime: "application/x-nintendo-nes-rom"
    };
    if (this.checkString("Cr24")) return {
      ext: "crx",
      mime: "application/x-google-chrome-extension"
    };
    if (this.checkString("MSCF") || this.checkString("ISc(")) return {
      ext: "cab",
      mime: "application/vnd.ms-cab-compressed"
    };
    if (this.check([237, 171, 238, 219])) return {
      ext: "rpm",
      mime: "application/x-rpm"
    };
    if (this.check([197, 208, 211, 198])) return {
      ext: "eps",
      mime: "application/eps"
    };
    if (this.check([40, 181, 47, 253])) return {
      ext: "zst",
      mime: "application/zstd"
    };
    if (this.check([127, 69, 76, 70])) return {
      ext: "elf",
      mime: "application/x-elf"
    };
    if (this.check([33, 66, 68, 78])) return {
      ext: "pst",
      mime: "application/vnd.ms-outlook"
    };
    if (this.checkString("PAR1") || this.checkString("PARE")) return {
      ext: "parquet",
      mime: "application/vnd.apache.parquet"
    };
    if (this.checkString("ttcf")) return {
      ext: "ttc",
      mime: "font/collection"
    };
    if (this.check([207, 250, 237, 254])) return {
      ext: "macho",
      mime: "application/x-mach-binary"
    };
    if (this.check([4, 34, 77, 24])) return {
      ext: "lz4",
      mime: "application/x-lz4"
    };
    if (this.checkString("regf")) return {
      ext: "dat",
      mime: "application/x-ft-windows-registry-hive"
    };
    if (this.check([79, 84, 84, 79, 0])) return {
      ext: "otf",
      mime: "font/otf"
    };
    if (this.checkString("#!AMR")) return {
      ext: "amr",
      mime: "audio/amr"
    };
    if (this.checkString("{\\rtf")) return {
      ext: "rtf",
      mime: "application/rtf"
    };
    if (this.check([70, 76, 86, 1])) return {
      ext: "flv",
      mime: "video/x-flv"
    };
    if (this.checkString("IMPM")) return {
      ext: "it",
      mime: "audio/x-it"
    };
    if (this.checkString("-lh0-", {
      offset: 2
    }) || this.checkString("-lh1-", {
      offset: 2
    }) || this.checkString("-lh2-", {
      offset: 2
    }) || this.checkString("-lh3-", {
      offset: 2
    }) || this.checkString("-lh4-", {
      offset: 2
    }) || this.checkString("-lh5-", {
      offset: 2
    }) || this.checkString("-lh6-", {
      offset: 2
    }) || this.checkString("-lh7-", {
      offset: 2
    }) || this.checkString("-lzs-", {
      offset: 2
    }) || this.checkString("-lz4-", {
      offset: 2
    }) || this.checkString("-lz5-", {
      offset: 2
    }) || this.checkString("-lhd-", {
      offset: 2
    })) return {
      ext: "lzh",
      mime: "application/x-lzh-compressed"
    };
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], {
        offset: 4,
        mask: [241]
      })) return {
        ext: "mpg",
        mime: "video/MP1S"
      };
      if (this.check([68], {
        offset: 4,
        mask: [196]
      })) return {
        ext: "mpg",
        mime: "video/MP2P"
      };
    }
    if (this.checkString("ITSF")) return {
      ext: "chm",
      mime: "application/vnd.ms-htmlhelp"
    };
    if (this.check([202, 254, 186, 190])) return {
      ext: "class",
      mime: "application/java-vm"
    };
    if (this.checkString(".RMF")) return {
      ext: "rm",
      mime: "application/vnd.rn-realmedia"
    };
    if (this.checkString("DRACO")) return {
      ext: "drc",
      mime: "application/vnd.google.draco"
    };
    if (this.check([253, 55, 122, 88, 90, 0])) return {
      ext: "xz",
      mime: "application/x-xz"
    };
    if (this.checkString("<?xml ")) return {
      ext: "xml",
      mime: "application/xml"
    };
    if (this.check([55, 122, 188, 175, 39, 28])) return {
      ext: "7z",
      mime: "application/x-7z-compressed"
    };
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1)) return {
      ext: "rar",
      mime: "application/x-rar-compressed"
    };
    if (this.checkString("solid ")) return {
      ext: "stl",
      mime: "model/stl"
    };
    if (this.checkString("AC")) {
      let R = new bs(4, "latin1").get(this.buffer, 2);
      if (R.match("^d*") && R >= 1000 && R <= 1050) return {
        ext: "dwg",
        mime: "image/vnd.dwg"
      };
    }
    if (this.checkString("070707")) return {
      ext: "cpio",
      mime: "application/x-cpio"
    };
    if (this.checkString("BLENDER")) return {
      ext: "blend",
      mime: "application/x-blender"
    };
    if (this.checkString("!<arch>")) {
      if (await T.ignore(8), (await T.readToken(new bs(13, "ascii"))) === "debian-binary") return {
        ext: "deb",
        mime: "application/x-deb"
      };
      return {
        ext: "ar",
        mime: "application/x-unix-archive"
      };
    }
    if (this.checkString("WEBVTT") && [`
`, "\r", "\t", " ", "\x00"].some(R => this.checkString(R, {
      offset: 6
    }))) return {
      ext: "vtt",
      mime: "text/vtt"
    };
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await T.ignore(8);
      async function R() {
        return {
          length: await T.readToken(JKR),
          type: await T.readToken(new bs(4, "latin1"))
        };
      }
      do {
        let a = await R();
        if (a.length < 0) return;
        switch (a.type) {
          case "IDAT":
            return {
              ext: "png",
              mime: "image/png"
            };
          case "acTL":
            return {
              ext: "apng",
              mime: "image/apng"
            };
          default:
            await T.ignore(a.length + 4);
        }
      } while (T.position + 8 < T.fileInfo.size);
      return {
        ext: "png",
        mime: "image/png"
      };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0])) return {
      ext: "arrow",
      mime: "application/vnd.apache.arrow.file"
    };
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0])) return {
      ext: "glb",
      mime: "model/gltf-binary"
    };
    if (this.check([102, 114, 101, 101], {
      offset: 4
    }) || this.check([109, 100, 97, 116], {
      offset: 4
    }) || this.check([109, 111, 111, 118], {
      offset: 4
    }) || this.check([119, 105, 100, 101], {
      offset: 4
    })) return {
      ext: "mov",
      mime: "video/quicktime"
    };
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24])) return {
      ext: "orf",
      mime: "image/x-olympus-orf"
    };
    if (this.checkString("gimp xcf ")) return {
      ext: "xcf",
      mime: "image/x-xcf"
    };
    if (this.checkString("ftyp", {
      offset: 4
    }) && (this.buffer[8] & 96) !== 0) {
      let R = new bs(4, "latin1").get(this.buffer, 8).replace("\x00", " ").trim();
      switch (R) {
        case "avif":
        case "avis":
          return {
            ext: "avif",
            mime: "image/avif"
          };
        case "mif1":
          return {
            ext: "heic",
            mime: "image/heif"
          };
        case "msf1":
          return {
            ext: "heic",
            mime: "image/heif-sequence"
          };
        case "heic":
        case "heix":
          return {
            ext: "heic",
            mime: "image/heic"
          };
        case "hevc":
        case "hevx":
          return {
            ext: "heic",
            mime: "image/heic-sequence"
          };
        case "qt":
          return {
            ext: "mov",
            mime: "video/quicktime"
          };
        case "M4V":
        case "M4VH":
        case "M4VP":
          return {
            ext: "m4v",
            mime: "video/x-m4v"
          };
        case "M4P":
          return {
            ext: "m4p",
            mime: "video/mp4"
          };
        case "M4B":
          return {
            ext: "m4b",
            mime: "audio/mp4"
          };
        case "M4A":
          return {
            ext: "m4a",
            mime: "audio/x-m4a"
          };
        case "F4V":
          return {
            ext: "f4v",
            mime: "video/mp4"
          };
        case "F4P":
          return {
            ext: "f4p",
            mime: "video/mp4"
          };
        case "F4A":
          return {
            ext: "f4a",
            mime: "audio/mp4"
          };
        case "F4B":
          return {
            ext: "f4b",
            mime: "audio/mp4"
          };
        case "crx":
          return {
            ext: "cr3",
            mime: "image/x-canon-cr3"
          };
        default:
          if (R.startsWith("3g")) {
            if (R.startsWith("3g2")) return {
              ext: "3g2",
              mime: "video/3gpp2"
            };
            return {
              ext: "3gp",
              mime: "video/3gpp"
            };
          }
          return {
            ext: "mp4",
            mime: "video/mp4"
          };
      }
    }
    if (this.checkString(`REGEDIT4\r
`)) return {
      ext: "reg",
      mime: "application/x-ms-regedit"
    };
    if (this.check([82, 73, 70, 70])) {
      if (this.checkString("WEBP", {
        offset: 8
      })) return {
        ext: "webp",
        mime: "image/webp"
      };
      if (this.check([65, 86, 73], {
        offset: 8
      })) return {
        ext: "avi",
        mime: "video/vnd.avi"
      };
      if (this.check([87, 65, 86, 69], {
        offset: 8
      })) return {
        ext: "wav",
        mime: "audio/wav"
      };
      if (this.check([81, 76, 67, 77], {
        offset: 8
      })) return {
        ext: "qcp",
        mime: "audio/qcelp"
      };
    }
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216])) return {
      ext: "rw2",
      mime: "image/x-panasonic-rw2"
    };
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function R() {
        let a = new Uint8Array(16);
        return await T.readBuffer(a), {
          id: a,
          size: Number(await T.readToken(TVR))
        };
      }
      await T.ignore(30);
      while (T.position + 24 < T.fileInfo.size) {
        let a = await R(),
          e = a.size - 24;
        if (Zc(a.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          let t = new Uint8Array(16);
          if (e -= await T.readBuffer(t), Zc(t, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) return {
            ext: "asf",
            mime: "audio/x-ms-asf"
          };
          if (Zc(t, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) return {
            ext: "asf",
            mime: "video/x-ms-asf"
          };
          break;
        }
        await T.ignore(e);
      }
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf"
      };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10])) return {
      ext: "ktx",
      mime: "image/ktx"
    };
    if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], {
      offset: 4
    })) return {
      ext: "mie",
      mime: "application/x-mie"
    };
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], {
      offset: 2
    })) return {
      ext: "shp",
      mime: "application/x-esri-shape"
    };
    if (this.check([255, 79, 255, 81])) return {
      ext: "j2c",
      mime: "image/j2c"
    };
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10])) switch (await T.ignore(20), await T.readToken(new bs(4, "ascii"))) {
      case "jp2 ":
        return {
          ext: "jp2",
          mime: "image/jp2"
        };
      case "jpx ":
        return {
          ext: "jpx",
          mime: "image/jpx"
        };
      case "jpm ":
        return {
          ext: "jpm",
          mime: "image/jpm"
        };
      case "mjp2":
        return {
          ext: "mj2",
          mime: "image/mj2"
        };
      default:
        return;
    }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10])) return {
      ext: "jxl",
      mime: "image/jxl"
    };
    if (this.check([254, 255])) {
      if (this.checkString("<?xml ", {
        offset: 2,
        encoding: "utf-16be"
      })) return {
        ext: "xml",
        mime: "application/xml"
      };
      return;
    }
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225])) return {
      ext: "cfb",
      mime: "application/x-cfb"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(256, T.fileInfo.size),
      mayBeLess: !0
    }), this.check([97, 99, 115, 112], {
      offset: 36
    })) return {
      ext: "icc",
      mime: "application/vnd.iccprofile"
    };
    if (this.checkString("**ACE", {
      offset: 7
    }) && this.checkString("**", {
      offset: 12
    })) return {
      ext: "ace",
      mime: "application/x-ace-compressed"
    };
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", {
        offset: 6
      })) return {
        ext: "vcf",
        mime: "text/vcard"
      };
      if (this.checkString("VCALENDAR", {
        offset: 6
      })) return {
        ext: "ics",
        mime: "text/calendar"
      };
    }
    if (this.checkString("FUJIFILMCCD-RAW")) return {
      ext: "raf",
      mime: "image/x-fujifilm-raf"
    };
    if (this.checkString("Extended Module:")) return {
      ext: "xm",
      mime: "audio/x-xm"
    };
    if (this.checkString("Creative Voice File")) return {
      ext: "voc",
      mime: "audio/x-voc"
    };
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      let R = new DataView(this.buffer.buffer).getUint32(12, !0);
      if (R > 12 && this.buffer.length >= R + 16) try {
        let a = new TextDecoder().decode(this.buffer.subarray(16, R + 16));
        if (JSON.parse(a).files) return {
          ext: "asar",
          mime: "application/x-asar"
        };
      } catch {}
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2])) return {
      ext: "mxf",
      mime: "application/mxf"
    };
    if (this.checkString("SCRM", {
      offset: 44
    })) return {
      ext: "s3m",
      mime: "audio/x-s3m"
    };
    if (this.check([71]) && this.check([71], {
      offset: 188
    })) return {
      ext: "mts",
      mime: "video/mp2t"
    };
    if (this.check([71], {
      offset: 4
    }) && this.check([71], {
      offset: 196
    })) return {
      ext: "mts",
      mime: "video/mp2t"
    };
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], {
      offset: 60
    })) return {
      ext: "mobi",
      mime: "application/x-mobipocket-ebook"
    };
    if (this.check([68, 73, 67, 77], {
      offset: 128
    })) return {
      ext: "dcm",
      mime: "application/dicom"
    };
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70])) return {
      ext: "lnk",
      mime: "application/x.ms.shortcut"
    };
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0])) return {
      ext: "alias",
      mime: "application/x.apple.alias"
    };
    if (this.checkString("Kaydara FBX Binary  \x00")) return {
      ext: "fbx",
      mime: "application/x.autodesk.fbx"
    };
    if (this.check([76, 80], {
      offset: 34
    }) && (this.check([0, 0, 1], {
      offset: 8
    }) || this.check([1, 0, 2], {
      offset: 8
    }) || this.check([2, 0, 2], {
      offset: 8
    }))) return {
      ext: "eot",
      mime: "application/vnd.ms-fontobject"
    };
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29])) return {
      ext: "indd",
      mime: "application/x-indesign"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(512, T.fileInfo.size),
      mayBeLess: !0
    }), this.checkString("ustar", {
      offset: 257
    }) && (this.checkString("\x00", {
      offset: 262
    }) || this.checkString(" ", {
      offset: 262
    })) || this.check([0, 0, 0, 0, 0, 0], {
      offset: 257
    }) && sVR(this.buffer)) return {
      ext: "tar",
      mime: "application/x-tar"
    };
    if (this.check([255, 254])) {
      if (this.checkString("<?xml ", {
        offset: 2,
        encoding: "utf-16le"
      })) return {
        ext: "xml",
        mime: "application/xml"
      };
      if (this.check([255, 14], {
        offset: 2
      }) && this.checkString("SketchUp Model", {
        offset: 4,
        encoding: "utf-16le"
      })) return {
        ext: "skp",
        mime: "application/vnd.sketchup.skp"
      };
      if (this.checkString(`Windows Registry Editor Version 5.00\r
`, {
        offset: 2,
        encoding: "utf-16le"
      })) return {
        ext: "reg",
        mime: "application/x-ms-regedit"
      };
      return;
    }
    if (this.checkString("-----BEGIN PGP MESSAGE-----")) return {
      ext: "pgp",
      mime: "application/pgp-encrypted"
    };
  };
  detectImprecise = async T => {
    if (this.buffer = new Uint8Array(lM), await T.peekBuffer(this.buffer, {
      length: Math.min(8, T.fileInfo.size),
      mayBeLess: !0
    }), this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179])) return {
      ext: "mpg",
      mime: "video/mpeg"
    };
    if (this.check([0, 1, 0, 0, 0])) return {
      ext: "ttf",
      mime: "font/ttf"
    };
    if (this.check([0, 0, 1, 0])) return {
      ext: "ico",
      mime: "image/x-icon"
    };
    if (this.check([0, 0, 2, 0])) return {
      ext: "cur",
      mime: "image/x-icon"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(2 + this.options.mpegOffsetTolerance, T.fileInfo.size),
      mayBeLess: !0
    }), this.buffer.length >= 2 + this.options.mpegOffsetTolerance) for (let R = 0; R <= this.options.mpegOffsetTolerance; ++R) {
      let a = this.scanMpeg(R);
      if (a) return a;
    }
  };
  async readTiffTag(T) {
    let R = await this.tokenizer.readToken(T ? zI : Pa);
    switch (this.tokenizer.ignore(10), R) {
      case 50341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw"
        };
      case 50706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng"
        };
      default:
    }
  }
  async readTiffIFD(T) {
    let R = await this.tokenizer.readToken(T ? zI : Pa);
    for (let a = 0; a < R; ++a) {
      let e = await this.readTiffTag(T);
      if (e) return e;
    }
  }
  async readTiffHeader(T) {
    let R = (T ? zI : Pa).get(this.buffer, 2),
      a = (T ? ZKR : Ie).get(this.buffer, 4);
    if (R === 42) {
      if (a >= 6) {
        if (this.checkString("CR", {
          offset: 8
        })) return {
          ext: "cr2",
          mime: "image/x-canon-cr2"
        };
        if (a >= 8) {
          let e = (T ? zI : Pa).get(this.buffer, 8),
            t = (T ? zI : Pa).get(this.buffer, 10);
          if (e === 28 && t === 254 || e === 31 && t === 11) return {
            ext: "nef",
            mime: "image/x-nikon-nef"
          };
        }
      }
      return await this.tokenizer.ignore(a), (await this.readTiffIFD(T)) ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (R === 43) return {
      ext: "tif",
      mime: "image/tiff"
    };
  }
  scanMpeg(T) {
    if (this.check([255, 224], {
      offset: T,
      mask: [255, 224]
    })) {
      if (this.check([16], {
        offset: T + 1,
        mask: [22]
      })) {
        if (this.check([8], {
          offset: T + 1,
          mask: [8]
        })) return {
          ext: "aac",
          mime: "audio/aac"
        };
        return {
          ext: "aac",
          mime: "audio/aac"
        };
      }
      if (this.check([2], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
      if (this.check([4], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp2",
        mime: "audio/mpeg"
      };
      if (this.check([6], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp1",
        mime: "audio/mpeg"
      };
    }
  }
}