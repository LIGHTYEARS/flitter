class CP {
  constructor(T, {
    size: R = 0
  } = {}) {
    let a = null;
    if (T === null) T = null;else if (WwT(T)) T = ri.from(T.toString());else if (n7(T)) ;else if (ri.isBuffer(T)) ;else if (YwT.isAnyArrayBuffer(T)) T = ri.from(T);else if (ArrayBuffer.isView(T)) T = ri.from(T.buffer, T.byteOffset, T.byteLength);else if (T instanceof Xl) ;else if (T instanceof xk) T = wIR(T), a = T.type.split("=")[1];else T = ri.from(String(T));
    let e = T;
    if (ri.isBuffer(T)) e = Xl.Readable.from(T);else if (n7(T)) e = Xl.Readable.from(T.stream());
    if (this[Et] = {
      body: T,
      stream: e,
      boundary: a,
      disturbed: !1,
      error: null
    }, this.size = R, T instanceof Xl) T.on("error", t => {
      let r = t instanceof IO ? t : new li(`Invalid response body while trying to fetch ${this.url}: ${t.message}`, "system", t);
      this[Et].error = r;
    });
  }
  get body() {
    return this[Et].stream;
  }
  get bodyUsed() {
    return this[Et].disturbed;
  }
  async arrayBuffer() {
    let {
      buffer: T,
      byteOffset: R,
      byteLength: a
    } = await A5(this);
    return T.slice(R, R + a);
  }
  async formData() {
    let T = this.headers.get("content-type");
    if (T.startsWith("application/x-www-form-urlencoded")) {
      let a = new xk(),
        e = new URLSearchParams(await this.text());
      for (let [t, r] of e) a.append(t, r);
      return a;
    }
    let {
      toFormData: R
    } = await Promise.resolve().then(() => (RgR(), VwT));
    return R(this.body, T);
  }
  async blob() {
    let T = this.headers && this.headers.get("content-type") || this[Et].body && this[Et].body.type || "",
      R = await this.arrayBuffer();
    return new Ub([R], {
      type: T
    });
  }
  async json() {
    let T = await this.text();
    return JSON.parse(T);
  }
  async text() {
    let T = await A5(this);
    return new TextDecoder().decode(T);
  }
  buffer() {
    return A5(this);
  }
}