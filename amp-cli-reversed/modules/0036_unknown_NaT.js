function aFT(T) {
  let R = new Uint8Array(Ie.len);
  return Ie.put(R, 0, T), R;
}
class NaT {
  constructor(T) {
    this.tokenizer = T, this.syncBuffer = new Uint8Array(Az);
  }
  async isZip() {
    return (await this.peekSignature()) === rP.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(Ie);
  }
  async findEndOfCentralDirectoryLocator() {
    let T = this.tokenizer,
      R = Math.min(16384, T.fileInfo.size),
      a = this.syncBuffer.subarray(0, R);
    await this.tokenizer.readBuffer(a, {
      position: T.fileInfo.size - R
    });
    for (let e = a.length - 4; e >= 0; e--) if (a[e] === t4[0] && a[e + 1] === t4[1] && a[e + 2] === t4[2] && a[e + 3] === t4[3]) return T.fileInfo.size - R + e;
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      Qc("Cannot reading central-directory without random-read support");
      return;
    }
    Qc("Reading central-directory...");
    let T = this.tokenizer.position,
      R = await this.findEndOfCentralDirectoryLocator();
    if (R > 0) {
      Qc("Central-directory 32-bit signature found");
      let a = await this.tokenizer.readToken(eVR, R),
        e = [];
      this.tokenizer.setPosition(a.offsetOfStartOfCd);
      for (let t = 0; t < a.nrOfEntriesOfSize; ++t) {
        let r = await this.tokenizer.readToken(tVR);
        if (r.signature !== rP.CentralFileHeader) throw Error("Expected Central-File-Header signature");
        r.filename = await this.tokenizer.readToken(new bs(r.filenameLength, "utf-8")), await this.tokenizer.ignore(r.extraFieldLength), await this.tokenizer.ignore(r.fileCommentLength), e.push(r), Qc(`Add central-directory file-entry: n=${t + 1}/${e.length}: filename=${e[t].filename}`);
      }
      return this.tokenizer.setPosition(T), e;
    }
    this.tokenizer.setPosition(T);
  }
  async unzip(T) {
    let R = await this.readCentralDirectory();
    if (R) return this.iterateOverCentralDirectory(R, T);
    let a = !1;
    do {
      let e = await this.readLocalFileHeader();
      if (!e) break;
      let t = T(e);
      a = !!t.stop;
      let r;
      if (await this.tokenizer.ignore(e.extraFieldLength), e.dataDescriptor && e.compressedSize === 0) {
        let h = [],
          i = Az;
        Qc("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let c = -1;
        while (c < 0 && i === Az) {
          i = await this.tokenizer.peekBuffer(this.syncBuffer, {
            mayBeLess: !0
          }), c = hVR(this.syncBuffer.subarray(0, i), rVR);
          let s = c >= 0 ? c : i;
          if (t.handler) {
            let A = new Uint8Array(s);
            await this.tokenizer.readBuffer(A), h.push(A);
          } else await this.tokenizer.ignore(s);
        }
        if (Qc(`Found data-descriptor-signature at pos=${this.tokenizer.position}`), t.handler) await this.inflate(e, iVR(h), t.handler);
      } else if (t.handler) Qc(`Reading compressed-file-data: ${e.compressedSize} bytes`), r = new Uint8Array(e.compressedSize), await this.tokenizer.readBuffer(r), await this.inflate(e, r, t.handler);else Qc(`Ignoring compressed-file-data: ${e.compressedSize} bytes`), await this.tokenizer.ignore(e.compressedSize);
      if (Qc(`Reading data-descriptor at pos=${this.tokenizer.position}`), e.dataDescriptor) {
        if ((await this.tokenizer.readToken(XuT)).signature !== 134695760) throw Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - XuT.len}`);
      }
    } while (!a);
  }
  async iterateOverCentralDirectory(T, R) {
    for (let a of T) {
      let e = R(a);
      if (e.handler) {
        this.tokenizer.setPosition(a.relativeOffsetOfLocalHeader);
        let t = await this.readLocalFileHeader();
        if (t) {
          await this.tokenizer.ignore(t.extraFieldLength);
          let r = new Uint8Array(a.compressedSize);
          await this.tokenizer.readBuffer(r), await this.inflate(t, r, e.handler);
        }
      }
      if (e.stop) break;
    }
  }
  async inflate(T, R, a) {
    if (T.compressedMethod === 0) return a(R);
    if (T.compressedMethod !== 8) throw Error(`Unsupported ZIP compression method: ${T.compressedMethod}`);
    Qc(`Decompress filename=${T.filename}, compressed-size=${R.length}`);
    let e = await NaT.decompressDeflateRaw(R);
    return a(e);
  }
  static async decompressDeflateRaw(T) {
    let R = new ReadableStream({
        start(t) {
          t.enqueue(T), t.close();
        }
      }),
      a = new DecompressionStream("deflate-raw"),
      e = R.pipeThrough(a);
    try {
      let t = await new Response(e).arrayBuffer();
      return new Uint8Array(t);
    } catch (t) {
      let r = t instanceof Error ? `Failed to deflate ZIP entry: ${t.message}` : "Unknown decompression error in ZIP entry";
      throw TypeError(r);
    }
  }
  async readLocalFileHeader() {
    let T = await this.tokenizer.peekToken(Ie);
    if (T === rP.LocalFileHeader) {
      let R = await this.tokenizer.readToken(aVR);
      return R.filename = await this.tokenizer.readToken(new bs(R.filenameLength, "utf-8")), R;
    }
    if (T === rP.CentralFileHeader) return !1;
    if (T === 3759263696) throw Error("Encrypted ZIP");
    throw Error("Unexpected signature");
  }
}