async function KdR(T) {
  return {
    size: T.size,
    type: T.type
  };
}
function E6T(T) {
  return new Promise(R => setTimeout(R, T));
}
class C6T {
  async stat(T) {
    let R = {
      size: 0,
      type: void 0
    };
    if (typeof T === "string") {
      let a = await tU.stat(T);
      return R.size = a.size, R.type = this.inferMimeType(T), R;
    } else return await KdR(T);
  }
  async upload(T, R, a) {
    if (typeof T === "string") return await this.uploadFileFromPath(T, R, a);else return FdR(T, R, a);
  }
  async uploadToFileSearchStore(T, R, a) {
    if (typeof T === "string") return await this.uploadFileToFileSearchStoreFromPath(T, R, a);else return GdR(T, R, a);
  }
  inferMimeType(T) {
    let R = T.slice(T.lastIndexOf(".") + 1);
    return {
      aac: "audio/aac",
      abw: "application/x-abiword",
      arc: "application/x-freearc",
      avi: "video/x-msvideo",
      azw: "application/vnd.amazon.ebook",
      bin: "application/octet-stream",
      bmp: "image/bmp",
      bz: "application/x-bzip",
      bz2: "application/x-bzip2",
      csh: "application/x-csh",
      css: "text/css",
      csv: "text/csv",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      eot: "application/vnd.ms-fontobject",
      epub: "application/epub+zip",
      gz: "application/gzip",
      gif: "image/gif",
      htm: "text/html",
      html: "text/html",
      ico: "image/vnd.microsoft.icon",
      ics: "text/calendar",
      jar: "application/java-archive",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      js: "text/javascript",
      json: "application/json",
      jsonld: "application/ld+json",
      kml: "application/vnd.google-earth.kml+xml",
      kmz: "application/vnd.google-earth.kmz+xml",
      mjs: "text/javascript",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      mpeg: "video/mpeg",
      mpkg: "application/vnd.apple.installer+xml",
      odt: "application/vnd.oasis.opendocument.text",
      oga: "audio/ogg",
      ogv: "video/ogg",
      ogx: "application/ogg",
      opus: "audio/opus",
      otf: "font/otf",
      png: "image/png",
      pdf: "application/pdf",
      php: "application/x-httpd-php",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      rar: "application/vnd.rar",
      rtf: "application/rtf",
      sh: "application/x-sh",
      svg: "image/svg+xml",
      swf: "application/x-shockwave-flash",
      tar: "application/x-tar",
      tif: "image/tiff",
      tiff: "image/tiff",
      ts: "video/mp2t",
      ttf: "font/ttf",
      txt: "text/plain",
      vsd: "application/vnd.visio",
      wav: "audio/wav",
      weba: "audio/webm",
      webm: "video/webm",
      webp: "image/webp",
      woff: "font/woff",
      woff2: "font/woff2",
      xhtml: "application/xhtml+xml",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xml: "application/xml",
      xul: "application/vnd.mozilla.xul+xml",
      zip: "application/zip",
      "3gp": "video/3gpp",
      "3g2": "video/3gpp2",
      "7z": "application/x-7z-compressed"
    }[R.toLowerCase()];
  }
  async uploadFileFromPath(T, R, a) {
    var e;
    let t = await this.uploadFileFromPathInternal(T, R, a),
      r = await (t === null || t === void 0 ? void 0 : t.json());
    if (((e = t === null || t === void 0 ? void 0 : t.headers) === null || e === void 0 ? void 0 : e[Yl]) !== "final") throw Error("Failed to upload file: Upload status is not finalized.");
    return r.file;
  }
  async uploadFileToFileSearchStoreFromPath(T, R, a) {
    var e;
    let t = await this.uploadFileFromPathInternal(T, R, a),
      r = await (t === null || t === void 0 ? void 0 : t.json());
    if (((e = t === null || t === void 0 ? void 0 : t.headers) === null || e === void 0 ? void 0 : e[Yl]) !== "final") throw Error("Failed to upload file: Upload status is not finalized.");
    let h = B8T(r),
      i = new rU();
    return Object.assign(i, h), i;
  }
  async uploadFileFromPathInternal(T, R, a) {
    var e, t;
    let r = 0,
      h = 0,
      i = new fk(new Response()),
      c = "upload",
      s,
      A = OBT.basename(T);
    try {
      if (s = await tU.open(T, "r"), !s) throw Error("Failed to open file");
      r = (await s.stat()).size;
      while (h < r) {
        let l = Math.min(Z6T, r - h);
        if (h + l >= r) c += ", finalize";
        let o = new Uint8Array(l),
          {
            bytesRead: n
          } = await s.read(o, 0, l, h);
        if (n !== l) throw Error(`Failed to read ${l} bytes from file at offset ${h}. bytes actually read: ${n}`);
        let p = new Blob([o]),
          _ = 0,
          m = TNT;
        while (_ < J6T) {
          if (i = await a.request({
            path: "",
            body: p,
            httpMethod: "POST",
            httpOptions: {
              apiVersion: "",
              baseUrl: R,
              headers: {
                "X-Goog-Upload-Command": c,
                "X-Goog-Upload-Offset": String(h),
                "Content-Length": String(n),
                "X-Goog-Upload-File-Name": A
              }
            }
          }), (e = i === null || i === void 0 ? void 0 : i.headers) === null || e === void 0 ? void 0 : e[Yl]) break;
          _++, await E6T(m), m = m * RNT;
        }
        if (h += n, ((t = i === null || i === void 0 ? void 0 : i.headers) === null || t === void 0 ? void 0 : t[Yl]) !== "active") break;
        if (r <= h) throw Error("All content has been uploaded, but the upload status is not finalized.");
      }
      return i;
    } finally {
      if (s) await s.close();
    }
  }
}