function mfT(T) {
  return T.line && T.column ? T : void 0;
}
function cYT(T) {
  return T >= 55296 && T <= 57343;
}
function pf0(T) {
  return T >= 56320 && T <= 57343;
}
function _f0(T, R) {
  return (T - 55296) * 1024 + 9216 + R;
}
function sYT(T) {
  return T !== 32 && T !== 10 && T !== 13 && T !== 9 && T !== 12 && T >= 1 && T <= 31 || T >= 127 && T <= 159;
}
function oYT(T) {
  return T >= 64976 && T <= 65007 || Af0.has(T);
}
class nYT {
  constructor(T) {
    this.handler = T, this.html = "", this.pos = -1, this.lastGapPos = -2, this.gapStack = [], this.skipNextNewLine = !1, this.lastChunkWritten = !1, this.endOfChunkHit = !1, this.bufferWaterline = bf0, this.isEol = !1, this.lineStartPos = 0, this.droppedBufferSize = 0, this.line = 1, this.lastErrOffset = -1;
  }
  get col() {
    return this.pos - this.lineStartPos + Number(this.lastGapPos !== this.pos);
  }
  get offset() {
    return this.droppedBufferSize + this.pos;
  }
  getError(T, R) {
    let {
        line: a,
        col: e,
        offset: t
      } = this,
      r = e + R,
      h = t + R;
    return {
      code: T,
      startLine: a,
      endLine: a,
      startCol: r,
      endCol: r,
      startOffset: h,
      endOffset: h
    };
  }
  _err(T) {
    if (this.handler.onParseError && this.lastErrOffset !== this.offset) this.lastErrOffset = this.offset, this.handler.onParseError(this.getError(T, 0));
  }
  _addGap() {
    this.gapStack.push(this.lastGapPos), this.lastGapPos = this.pos;
  }
  _processSurrogate(T) {
    if (this.pos !== this.html.length - 1) {
      let R = this.html.charCodeAt(this.pos + 1);
      if (pf0(R)) return this.pos++, this._addGap(), _f0(T, R);
    } else if (!this.lastChunkWritten) return this.endOfChunkHit = !0, HT.EOF;
    return this._err(vR.surrogateInInputStream), T;
  }
  willDropParsedChunk() {
    return this.pos > this.bufferWaterline;
  }
  dropParsedChunk() {
    if (this.willDropParsedChunk()) this.html = this.html.substring(this.pos), this.lineStartPos -= this.pos, this.droppedBufferSize += this.pos, this.pos = 0, this.lastGapPos = -2, this.gapStack.length = 0;
  }
  write(T, R) {
    if (this.html.length > 0) this.html += T;else this.html = T;
    this.endOfChunkHit = !1, this.lastChunkWritten = R;
  }
  insertHtmlAtCurrentPos(T) {
    this.html = this.html.substring(0, this.pos + 1) + T + this.html.substring(this.pos + 1), this.endOfChunkHit = !1;
  }
  startsWith(T, R) {
    if (this.pos + T.length > this.html.length) return this.endOfChunkHit = !this.lastChunkWritten, !1;
    if (R) return this.html.startsWith(T, this.pos);
    for (let a = 0; a < T.length; a++) if ((this.html.charCodeAt(this.pos + a) | 32) !== T.charCodeAt(a)) return !1;
    return !0;
  }
  peek(T) {
    let R = this.pos + T;
    if (R >= this.html.length) return this.endOfChunkHit = !this.lastChunkWritten, HT.EOF;
    let a = this.html.charCodeAt(R);
    return a === HT.CARRIAGE_RETURN ? HT.LINE_FEED : a;
  }
  advance() {
    if (this.pos++, this.isEol) this.isEol = !1, this.line++, this.lineStartPos = this.pos;
    if (this.pos >= this.html.length) return this.endOfChunkHit = !this.lastChunkWritten, HT.EOF;
    let T = this.html.charCodeAt(this.pos);
    if (T === HT.CARRIAGE_RETURN) return this.isEol = !0, this.skipNextNewLine = !0, HT.LINE_FEED;
    if (T === HT.LINE_FEED) {
      if (this.isEol = !0, this.skipNextNewLine) return this.line--, this.skipNextNewLine = !1, this._addGap(), this.advance();
    }
    if (this.skipNextNewLine = !1, cYT(T)) T = this._processSurrogate(T);
    if (!(this.handler.onParseError === null || T > 31 && T < 127 || T === HT.LINE_FEED || T === HT.CARRIAGE_RETURN || T > 159 && T < 64976)) this._checkForProblematicCharacters(T);
    return T;
  }
  _checkForProblematicCharacters(T) {
    if (sYT(T)) this._err(vR.controlCharacterInInputStream);else if (oYT(T)) this._err(vR.noncharacterInInputStream);
  }
  retreat(T) {
    this.pos -= T;
    while (this.pos < this.lastGapPos) this.lastGapPos = this.gapStack.pop(), this.pos--;
    this.isEol = !1;
  }
}