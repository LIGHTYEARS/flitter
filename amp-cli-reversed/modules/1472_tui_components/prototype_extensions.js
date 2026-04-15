Rf.prototype.normal = {};
Rf.prototype.property = {};
Rf.prototype.space = void 0;
Tr.prototype.attribute = "";
Tr.prototype.booleanish = !1;
Tr.prototype.boolean = !1;
Tr.prototype.commaOrSpaceSeparated = !1;
Tr.prototype.commaSeparated = !1;
Tr.prototype.defined = !1;
Tr.prototype.mustUseProperty = !1;
Tr.prototype.number = !1;
Tr.prototype.overloadedBoolean = !1;
Tr.prototype.property = "";
Tr.prototype.spaceSeparated = !1;
Tr.prototype.space = void 0;
MH.prototype.defined = !0;
mt.prototype.file = "";
mt.prototype.name = "";
mt.prototype.reason = "";
mt.prototype.message = "";
mt.prototype.stack = "";
mt.prototype.column = void 0;
mt.prototype.line = void 0;
mt.prototype.ancestors = void 0;
mt.prototype.cause = void 0;
mt.prototype.fatal = void 0;
mt.prototype.place = void 0;
mt.prototype.ruleId = void 0;
mt.prototype.source = void 0;
fn.prototype.close = function () {
  if (!this.isOpen) return;
  this.isOpen = !1, this.reader.unref();
};
fn.prototype.readEntry = function () {
  if (!this.lazyEntries) throw Error("readEntry() called without lazyEntries:true");
  this._readEntry();
};
fn.prototype._readEntry = function () {
  var T = this;
  if (T.entryCount === T.entriesRead) {
    setImmediate(function () {
      if (T.autoClose) T.close();
      if (T.emittedError) return;
      T.emit("end");
    });
    return;
  }
  if (T.emittedError) return;
  var R = In(46);
  tx(T.reader, R, 0, R.length, T.readEntryCursor, function (a) {
    if (a) return is(T, a);
    if (T.emittedError) return;
    var e = new PW(),
      t = R.readUInt32LE(0);
    if (t !== 33639248) return is(T, Error("invalid central directory file header signature: 0x" + t.toString(16)));
    if (e.versionMadeBy = R.readUInt16LE(4), e.versionNeededToExtract = R.readUInt16LE(6), e.generalPurposeBitFlag = R.readUInt16LE(8), e.compressionMethod = R.readUInt16LE(10), e.lastModFileTime = R.readUInt16LE(12), e.lastModFileDate = R.readUInt16LE(14), e.crc32 = R.readUInt32LE(16), e.compressedSize = R.readUInt32LE(20), e.uncompressedSize = R.readUInt32LE(24), e.fileNameLength = R.readUInt16LE(28), e.extraFieldLength = R.readUInt16LE(30), e.fileCommentLength = R.readUInt16LE(32), e.internalFileAttributes = R.readUInt16LE(36), e.externalFileAttributes = R.readUInt32LE(38), e.relativeOffsetOfLocalHeader = R.readUInt32LE(42), e.generalPurposeBitFlag & 64) return is(T, Error("strong encryption is not supported"));
    T.readEntryCursor += 46, R = In(e.fileNameLength + e.extraFieldLength + e.fileCommentLength), tx(T.reader, R, 0, R.length, T.readEntryCursor, function (r) {
      if (r) return is(T, r);
      if (T.emittedError) return;
      e.fileNameRaw = R.subarray(0, e.fileNameLength);
      var h = e.fileNameLength + e.extraFieldLength;
      e.extraFieldRaw = R.subarray(e.fileNameLength, h), e.fileCommentRaw = R.subarray(h, h + e.fileCommentLength);
      try {
        e.extraFields = qH0(e.extraFieldRaw);
      } catch (_) {
        return is(T, _);
      }
      if (T.decodeStrings) {
        var i = (e.generalPurposeBitFlag & 2048) !== 0;
        e.fileComment = xB(e.fileCommentRaw, i), e.fileName = HH0(e.generalPurposeBitFlag, e.fileNameRaw, e.extraFields, T.strictFileNames);
        var c = WH0(e.fileName);
        if (c != null) return is(T, Error(c));
      } else e.fileComment = e.fileCommentRaw, e.fileName = e.fileNameRaw;
      e.comment = e.fileComment, T.readEntryCursor += R.length, T.entriesRead += 1;
      for (var s = 0; s < e.extraFields.length; s++) {
        var A = e.extraFields[s];
        if (A.id !== 1) continue;
        var l = A.data,
          o = 0;
        if (e.uncompressedSize === 4294967295) {
          if (o + 8 > l.length) return is(T, Error("zip64 extended information extra field does not include uncompressed size"));
          e.uncompressedSize = JP(l, o), o += 8;
        }
        if (e.compressedSize === 4294967295) {
          if (o + 8 > l.length) return is(T, Error("zip64 extended information extra field does not include compressed size"));
          e.compressedSize = JP(l, o), o += 8;
        }
        if (e.relativeOffsetOfLocalHeader === 4294967295) {
          if (o + 8 > l.length) return is(T, Error("zip64 extended information extra field does not include relative header offset"));
          e.relativeOffsetOfLocalHeader = JP(l, o), o += 8;
        }
        break;
      }
      if (T.validateEntrySizes && e.compressionMethod === 0) {
        var n = e.uncompressedSize;
        if (e.isEncrypted()) n += 12;
        if (e.compressedSize !== n) {
          var p = "compressed/uncompressed size mismatch for stored file: " + e.compressedSize + " != " + e.uncompressedSize;
          return is(T, Error(p));
        }
      }
      if (T.emit("entry", e), !T.lazyEntries) T._readEntry();
    });
  });
};
fn.prototype.openReadStream = function (T, R, a) {
  var e = this,
    t = 0,
    r = T.compressedSize;
  if (a == null) a = R, R = null;
  if (R == null) R = {};else {
    if (R.decrypt != null) {
      if (!T.isEncrypted()) throw Error("options.decrypt can only be specified for encrypted entries");
      if (R.decrypt !== !1) throw Error("invalid options.decrypt value: " + R.decrypt);
      if (T.isCompressed()) {
        if (R.decompress !== !1) throw Error("entry is encrypted and compressed, and options.decompress !== false");
      }
    }
    if (R.decompress != null) {
      if (!T.isCompressed()) throw Error("options.decompress can only be specified for compressed entries");
      if (!(R.decompress === !1 || R.decompress === !0)) throw Error("invalid options.decompress value: " + R.decompress);
    }
    if (R.start != null || R.end != null) {
      if (T.isCompressed() && R.decompress !== !1) throw Error("start/end range not allowed for compressed entry without options.decompress === false");
      if (T.isEncrypted() && R.decrypt !== !1) throw Error("start/end range not allowed for encrypted entry without options.decrypt === false");
    }
    if (R.start != null) {
      if (t = R.start, t < 0) throw Error("options.start < 0");
      if (t > T.compressedSize) throw Error("options.start > entry.compressedSize");
    }
    if (R.end != null) {
      if (r = R.end, r < 0) throw Error("options.end < 0");
      if (r > T.compressedSize) throw Error("options.end > entry.compressedSize");
      if (r < t) throw Error("options.end < options.start");
    }
  }
  if (!e.isOpen) return a(Error("closed"));
  if (T.isEncrypted()) {
    if (R.decrypt !== !1) return a(Error("entry is encrypted, and options.decrypt !== false"));
  }
  var h;
  if (T.compressionMethod === 0) h = !1;else if (T.compressionMethod === 8) h = R.decompress != null ? R.decompress : !0;else return a(Error("unsupported compression method: " + T.compressionMethod));
  e.readLocalFileHeader(T, {
    minimal: !0
  }, function (i, c) {
    if (i) return a(i);
    e.openReadStreamLowLevel(c.fileDataStart, T.compressedSize, t, r, h, T.uncompressedSize, a);
  });
};
fn.prototype.openReadStreamLowLevel = function (T, R, a, e, t, r, h) {
  var i = this,
    c = T + R,
    s = i.reader.createReadStream({
      start: T + a,
      end: T + e
    }),
    A = s;
  if (t) {
    var l = !1,
      o = dH0.createInflateRaw();
    if (s.on("error", function (n) {
      setImmediate(function () {
        if (!l) o.emit("error", n);
      });
    }), s.pipe(o), i.validateEntrySizes) A = new td(r), o.on("error", function (n) {
      setImmediate(function () {
        if (!l) A.emit("error", n);
      });
    }), o.pipe(A);else A = o;
    UQ(A, function () {
      if (l = !0, o !== A) o.unpipe(A);
      s.unpipe(o), s.destroy();
    });
  }
  h(null, A);
};
fn.prototype.readLocalFileHeader = function (T, R, a) {
  var e = this;
  if (a == null) a = R, R = null;
  if (R == null) R = {};
  e.reader.ref();
  var t = In(30);
  tx(e.reader, t, 0, t.length, T.relativeOffsetOfLocalHeader, function (r) {
    try {
      if (r) return a(r);
      var h = t.readUInt32LE(0);
      if (h !== 67324752) return a(Error("invalid local file header signature: 0x" + h.toString(16)));
      var i = t.readUInt16LE(26),
        c = t.readUInt16LE(28),
        s = T.relativeOffsetOfLocalHeader + 30 + i + c;
      if (s + T.compressedSize > e.fileSize) return a(Error("file data overflows file bounds: " + s + " + " + T.compressedSize + " > " + e.fileSize));
      if (R.minimal) return a(null, {
        fileDataStart: s
      });
      var A = new NH0();
      A.fileDataStart = s, A.versionNeededToExtract = t.readUInt16LE(4), A.generalPurposeBitFlag = t.readUInt16LE(6), A.compressionMethod = t.readUInt16LE(8), A.lastModFileTime = t.readUInt16LE(10), A.lastModFileDate = t.readUInt16LE(12), A.crc32 = t.readUInt32LE(14), A.compressedSize = t.readUInt32LE(18), A.uncompressedSize = t.readUInt32LE(22), A.fileNameLength = i, A.extraFieldLength = c, t = In(i + c), e.reader.ref(), tx(e.reader, t, 0, t.length, T.relativeOffsetOfLocalHeader + 30, function (l) {
        try {
          if (l) return a(l);
          return A.fileName = t.subarray(0, i), A.extraField = t.subarray(i), a(null, A);
        } finally {
          e.reader.unref();
        }
      });
    } finally {
      e.reader.unref();
    }
  });
};
PW.prototype.getLastModDate = function (T) {
  if (T == null) T = {};
  if (!T.forceDosFormat) for (var R = 0; R < this.extraFields.length; R++) {
    var a = this.extraFields[R];
    if (a.id === 21589) {
      var e = a.data;
      if (e.length < 5) continue;
      var t = e[0],
        r = 1;
      if (!(t & r)) continue;
      var h = e.readInt32LE(1);
      return new Date(h * 1000);
    } else if (a.id === 10) {
      var e = a.data,
        i = 4;
      while (i < e.length + 4) {
        var c = e.readUInt16LE(i);
        i += 2;
        var s = e.readUInt16LE(i);
        if (i += 2, c !== 1) {
          i += s;
          continue;
        }
        if (s < 8 || i + s > e.length) break;
        var A = 4294967296 * e.readInt32LE(i + 4) + e.readUInt32LE(i),
          l = A / 1e4 - 11644473600000;
        return new Date(l);
      }
    }
  }
  return UH0(this.lastModFileDate, this.lastModFileTime, T.timezone);
};
PW.prototype.isEncrypted = function () {
  return (this.generalPurposeBitFlag & 1) !== 0;
};
PW.prototype.isCompressed = function () {
  return this.compressionMethod === 8;
};
td.prototype._transform = function (T, R, a) {
  if (this.actualByteCount += T.length, this.actualByteCount > this.expectedByteCount) {
    var e = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
    return a(Error(e));
  }
  a(null, T);
};
td.prototype._flush = function (T) {
  if (this.actualByteCount < this.expectedByteCount) {
    var R = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
    return T(Error(R));
  }
  T();
};
Zm.prototype.ref = function () {
  this.refCount += 1;
};
Zm.prototype.unref = function () {
  var T = this;
  if (T.refCount -= 1, T.refCount > 0) return;
  if (T.refCount < 0) throw Error("invalid unref");
  T.close(R);
  function R(a) {
    if (a) return T.emit("error", a);
    T.emit("close");
  }
};
Zm.prototype.createReadStream = function (T) {
  if (T == null) T = {};
  var {
    start: R,
    end: a
  } = T;
  if (R === a) {
    var e = new thT();
    return setImmediate(function () {
      e.end();
    }), e;
  }
  var t = this._readStreamForRange(R, a),
    r = !1,
    h = new kW(this);
  t.on("error", function (c) {
    setImmediate(function () {
      if (!r) h.emit("error", c);
    });
  }), UQ(h, function () {
    t.unpipe(h), h.unref(), t.destroy();
  });
  var i = new td(a - R);
  return h.on("error", function (c) {
    setImmediate(function () {
      if (!r) i.emit("error", c);
    });
  }), UQ(i, function () {
    r = !0, h.unpipe(i), h.destroy();
  }), t.pipe(h).pipe(i);
};
Zm.prototype._readStreamForRange = function (T, R) {
  throw Error("not implemented");
};
Zm.prototype.read = function (T, R, a, e, t) {
  var r = this.createReadStream({
      start: e,
      end: e + a
    }),
    h = new LH0(),
    i = 0;
  h._write = function (c, s, A) {
    c.copy(T, R + i, 0, c.length), i += c.length, A();
  }, h.on("finish", t), r.on("error", function (c) {
    t(c);
  }), r.pipe(h);
};
Zm.prototype.close = function (T) {
  setImmediate(T);
};
kW.prototype._flush = function (T) {
  this.unref(), T();
};
kW.prototype.unref = function (T) {
  if (this.unreffedYet) return;
  this.unreffedYet = !0, this.context.unref();
};