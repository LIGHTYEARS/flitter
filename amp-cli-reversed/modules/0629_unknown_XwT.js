class XwT {
  constructor(T) {
    this.index = 0, this.flags = 0, this.onHeaderEnd = Xp, this.onHeaderField = Xp, this.onHeadersEnd = Xp, this.onHeaderValue = Xp, this.onPartBegin = Xp, this.onPartData = Xp, this.onPartEnd = Xp, this.boundaryChars = {}, T = `\r
--` + T;
    let R = new Uint8Array(T.length);
    for (let a = 0; a < T.length; a++) R[a] = T.charCodeAt(a), this.boundaryChars[R[a]] = !0;
    this.boundary = R, this.lookbehind = new Uint8Array(this.boundary.length + 8), this.state = r3.START_BOUNDARY;
  }
  write(T) {
    let R = 0,
      a = T.length,
      e = this.index,
      {
        lookbehind: t,
        boundary: r,
        boundaryChars: h,
        index: i,
        state: c,
        flags: s
      } = this,
      A = this.boundary.length,
      l = A - 1,
      o = T.length,
      n,
      p,
      _ = u => {
        this[u + "Mark"] = R;
      },
      m = u => {
        delete this[u + "Mark"];
      },
      b = (u, P, k, x) => {
        if (P === void 0 || P !== k) this[u](x && x.subarray(P, k));
      },
      y = (u, P) => {
        let k = u + "Mark";
        if (!(k in this)) return;
        if (P) b(u, this[k], R, T), delete this[k];else b(u, this[k], T.length, T), this[k] = 0;
      };
    for (R = 0; R < a; R++) switch (n = T[R], c) {
      case r3.START_BOUNDARY:
        if (i === r.length - 2) {
          if (n === yI) s |= Co.LAST_BOUNDARY;else if (n !== pC) return;
          i++;
          break;
        } else if (i - 1 === r.length - 2) {
          if (s & Co.LAST_BOUNDARY && n === yI) c = r3.END, s = 0;else if (!(s & Co.LAST_BOUNDARY) && n === AC) i = 0, b("onPartBegin"), c = r3.HEADER_FIELD_START;else return;
          break;
        }
        if (n !== r[i + 2]) i = -2;
        if (n === r[i + 2]) i++;
        break;
      case r3.HEADER_FIELD_START:
        c = r3.HEADER_FIELD, _("onHeaderField"), i = 0;
      case r3.HEADER_FIELD:
        if (n === pC) {
          m("onHeaderField"), c = r3.HEADERS_ALMOST_DONE;
          break;
        }
        if (i++, n === yI) break;
        if (n === QIR) {
          if (i === 1) return;
          y("onHeaderField", !0), c = r3.HEADER_VALUE_START;
          break;
        }
        if (p = TgR(n), p < ZIR || p > JIR) return;
        break;
      case r3.HEADER_VALUE_START:
        if (n === YIR) break;
        _("onHeaderValue"), c = r3.HEADER_VALUE;
      case r3.HEADER_VALUE:
        if (n === pC) y("onHeaderValue", !0), b("onHeaderEnd"), c = r3.HEADER_VALUE_ALMOST_DONE;
        break;
      case r3.HEADER_VALUE_ALMOST_DONE:
        if (n !== AC) return;
        c = r3.HEADER_FIELD_START;
        break;
      case r3.HEADERS_ALMOST_DONE:
        if (n !== AC) return;
        b("onHeadersEnd"), c = r3.PART_DATA_START;
        break;
      case r3.PART_DATA_START:
        c = r3.PART_DATA, _("onPartData");
      case r3.PART_DATA:
        if (e = i, i === 0) {
          R += l;
          while (R < o && !(T[R] in h)) R += A;
          R -= l, n = T[R];
        }
        if (i < r.length) {
          if (r[i] === n) {
            if (i === 0) y("onPartData", !0);
            i++;
          } else i = 0;
        } else if (i === r.length) {
          if (i++, n === pC) s |= Co.PART_BOUNDARY;else if (n === yI) s |= Co.LAST_BOUNDARY;else i = 0;
        } else if (i - 1 === r.length) if (s & Co.PART_BOUNDARY) {
          if (i = 0, n === AC) {
            s &= ~Co.PART_BOUNDARY, b("onPartEnd"), b("onPartBegin"), c = r3.HEADER_FIELD_START;
            break;
          }
        } else if (s & Co.LAST_BOUNDARY) {
          if (n === yI) b("onPartEnd"), c = r3.END, s = 0;else i = 0;
        } else i = 0;
        if (i > 0) t[i - 1] = n;else if (e > 0) {
          let u = new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
          b("onPartData", 0, e, u), e = 0, _("onPartData"), R--;
        }
        break;
      case r3.END:
        break;
      default:
        throw Error(`Unexpected state entered: ${c}`);
    }
    y("onHeaderField"), y("onHeaderValue"), y("onPartData"), this.index = i, this.state = c, this.flags = s;
  }
  end() {
    if (this.state === r3.HEADER_FIELD_START && this.index === 0 || this.state === r3.PART_DATA && this.index === this.boundary.length) this.onPartEnd();else if (this.state !== r3.END) throw Error("MultipartParser.end(): stream ended unexpectedly");
  }
}