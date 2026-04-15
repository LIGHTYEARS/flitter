class bYT {
  constructor(T, R) {
    this.options = T, this.handler = R, this.paused = !1, this.inLoop = !1, this.inForeignNode = !1, this.lastStartTagName = "", this.active = !1, this.state = zT.DATA, this.returnState = zT.DATA, this.entityStartPos = 0, this.consumedAfterSnapshot = -1, this.currentCharacterToken = null, this.currentToken = null, this.currentAttr = {
      name: "",
      value: ""
    }, this.preprocessor = new nYT(R), this.currentLocation = this.getCurrentLocation(-1), this.entityDecoder = new XtT(AYT, (a, e) => {
      this.preprocessor.pos = this.entityStartPos + e - 1, this._flushCodePointConsumedAsCharacterReference(a);
    }, R.onParseError ? {
      missingSemicolonAfterCharacterReference: () => {
        this._err(vR.missingSemicolonAfterCharacterReference, 1);
      },
      absenceOfDigitsInNumericCharacterReference: a => {
        this._err(vR.absenceOfDigitsInNumericCharacterReference, this.entityStartPos - this.preprocessor.pos + a);
      },
      validateNumericCharacterReference: a => {
        let e = Of0(a);
        if (e) this._err(e, 1);
      }
    } : void 0);
  }
  _err(T, R = 0) {
    var a, e;
    (e = (a = this.handler).onParseError) === null || e === void 0 || e.call(a, this.preprocessor.getError(T, R));
  }
  getCurrentLocation(T) {
    if (!this.options.sourceCodeLocationInfo) return null;
    return {
      startLine: this.preprocessor.line,
      startCol: this.preprocessor.col - T,
      startOffset: this.preprocessor.offset - T,
      endLine: -1,
      endCol: -1,
      endOffset: -1
    };
  }
  _runParsingLoop() {
    if (this.inLoop) return;
    this.inLoop = !0;
    while (this.active && !this.paused) {
      this.consumedAfterSnapshot = 0;
      let T = this._consume();
      if (!this._ensureHibernation()) this._callState(T);
    }
    this.inLoop = !1;
  }
  pause() {
    this.paused = !0;
  }
  resume(T) {
    if (!this.paused) throw Error("Parser was already resumed");
    if (this.paused = !1, this.inLoop) return;
    if (this._runParsingLoop(), !this.paused) T === null || T === void 0 || T();
  }
  write(T, R, a) {
    if (this.active = !0, this.preprocessor.write(T, R), this._runParsingLoop(), !this.paused) a === null || a === void 0 || a();
  }
  insertHtmlAtCurrentPos(T) {
    this.active = !0, this.preprocessor.insertHtmlAtCurrentPos(T), this._runParsingLoop();
  }
  _ensureHibernation() {
    if (this.preprocessor.endOfChunkHit) return this.preprocessor.retreat(this.consumedAfterSnapshot), this.consumedAfterSnapshot = 0, this.active = !1, !0;
    return !1;
  }
  _consume() {
    return this.consumedAfterSnapshot++, this.preprocessor.advance();
  }
  _advanceBy(T) {
    this.consumedAfterSnapshot += T;
    for (let R = 0; R < T; R++) this.preprocessor.advance();
  }
  _consumeSequenceIfMatch(T, R) {
    if (this.preprocessor.startsWith(T, R)) return this._advanceBy(T.length - 1), !0;
    return !1;
  }
  _createStartTagToken() {
    this.currentToken = {
      type: u8.START_TAG,
      tagName: "",
      tagID: sT.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(1)
    };
  }
  _createEndTagToken() {
    this.currentToken = {
      type: u8.END_TAG,
      tagName: "",
      tagID: sT.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(2)
    };
  }
  _createCommentToken(T) {
    this.currentToken = {
      type: u8.COMMENT,
      data: "",
      location: this.getCurrentLocation(T)
    };
  }
  _createDoctypeToken(T) {
    this.currentToken = {
      type: u8.DOCTYPE,
      name: T,
      forceQuirks: !1,
      publicId: null,
      systemId: null,
      location: this.currentLocation
    };
  }
  _createCharacterToken(T, R) {
    this.currentCharacterToken = {
      type: T,
      chars: R,
      location: this.currentLocation
    };
  }
  _createAttr(T) {
    this.currentAttr = {
      name: T,
      value: ""
    }, this.currentLocation = this.getCurrentLocation(0);
  }
  _leaveAttrName() {
    var T, R;
    let a = this.currentToken;
    if (lYT(a, this.currentAttr.name) === null) {
      if (a.attrs.push(this.currentAttr), a.location && this.currentLocation) {
        let e = (T = (R = a.location).attrs) !== null && T !== void 0 ? T : R.attrs = Object.create(null);
        e[this.currentAttr.name] = this.currentLocation, this._leaveAttrValue();
      }
    } else this._err(vR.duplicateAttribute);
  }
  _leaveAttrValue() {
    if (this.currentLocation) this.currentLocation.endLine = this.preprocessor.line, this.currentLocation.endCol = this.preprocessor.col, this.currentLocation.endOffset = this.preprocessor.offset;
  }
  prepareToken(T) {
    if (this._emitCurrentCharacterToken(T.location), this.currentToken = null, T.location) T.location.endLine = this.preprocessor.line, T.location.endCol = this.preprocessor.col + 1, T.location.endOffset = this.preprocessor.offset + 1;
    this.currentLocation = this.getCurrentLocation(-1);
  }
  emitCurrentTagToken() {
    let T = this.currentToken;
    if (this.prepareToken(T), T.tagID = DH(T.tagName), T.type === u8.START_TAG) this.lastStartTagName = T.tagName, this.handler.onStartTag(T);else {
      if (T.attrs.length > 0) this._err(vR.endTagWithAttributes);
      if (T.selfClosing) this._err(vR.endTagWithTrailingSolidus);
      this.handler.onEndTag(T);
    }
    this.preprocessor.dropParsedChunk();
  }
  emitCurrentComment(T) {
    this.prepareToken(T), this.handler.onComment(T), this.preprocessor.dropParsedChunk();
  }
  emitCurrentDoctype(T) {
    this.prepareToken(T), this.handler.onDoctype(T), this.preprocessor.dropParsedChunk();
  }
  _emitCurrentCharacterToken(T) {
    if (this.currentCharacterToken) {
      if (T && this.currentCharacterToken.location) this.currentCharacterToken.location.endLine = T.startLine, this.currentCharacterToken.location.endCol = T.startCol, this.currentCharacterToken.location.endOffset = T.startOffset;
      switch (this.currentCharacterToken.type) {
        case u8.CHARACTER:
          {
            this.handler.onCharacter(this.currentCharacterToken);
            break;
          }
        case u8.NULL_CHARACTER:
          {
            this.handler.onNullCharacter(this.currentCharacterToken);
            break;
          }
        case u8.WHITESPACE_CHARACTER:
          {
            this.handler.onWhitespaceCharacter(this.currentCharacterToken);
            break;
          }
      }
      this.currentCharacterToken = null;
    }
  }
  _emitEOFToken() {
    let T = this.getCurrentLocation(0);
    if (T) T.endLine = T.startLine, T.endCol = T.startCol, T.endOffset = T.startOffset;
    this._emitCurrentCharacterToken(T), this.handler.onEof({
      type: u8.EOF,
      location: T
    }), this.active = !1;
  }
  _appendCharToCurrentCharacterToken(T, R) {
    if (this.currentCharacterToken) if (this.currentCharacterToken.type === T) {
      this.currentCharacterToken.chars += R;
      return;
    } else this.currentLocation = this.getCurrentLocation(0), this._emitCurrentCharacterToken(this.currentLocation), this.preprocessor.dropParsedChunk();
    this._createCharacterToken(T, R);
  }
  _emitCodePoint(T) {
    let R = _YT(T) ? u8.WHITESPACE_CHARACTER : T === HT.NULL ? u8.NULL_CHARACTER : u8.CHARACTER;
    this._appendCharToCurrentCharacterToken(R, String.fromCodePoint(T));
  }
  _emitChars(T) {
    this._appendCharToCurrentCharacterToken(u8.CHARACTER, T);
  }
  _startCharacterReference() {
    this.returnState = this.state, this.state = zT.CHARACTER_REFERENCE, this.entityStartPos = this.preprocessor.pos, this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute() ? Fo.Attribute : Fo.Legacy);
  }
  _isCharacterReferenceInAttribute() {
    return this.returnState === zT.ATTRIBUTE_VALUE_DOUBLE_QUOTED || this.returnState === zT.ATTRIBUTE_VALUE_SINGLE_QUOTED || this.returnState === zT.ATTRIBUTE_VALUE_UNQUOTED;
  }
  _flushCodePointConsumedAsCharacterReference(T) {
    if (this._isCharacterReferenceInAttribute()) this.currentAttr.value += String.fromCodePoint(T);else this._emitCodePoint(T);
  }
  _callState(T) {
    switch (this.state) {
      case zT.DATA:
        {
          this._stateData(T);
          break;
        }
      case zT.RCDATA:
        {
          this._stateRcdata(T);
          break;
        }
      case zT.RAWTEXT:
        {
          this._stateRawtext(T);
          break;
        }
      case zT.SCRIPT_DATA:
        {
          this._stateScriptData(T);
          break;
        }
      case zT.PLAINTEXT:
        {
          this._statePlaintext(T);
          break;
        }
      case zT.TAG_OPEN:
        {
          this._stateTagOpen(T);
          break;
        }
      case zT.END_TAG_OPEN:
        {
          this._stateEndTagOpen(T);
          break;
        }
      case zT.TAG_NAME:
        {
          this._stateTagName(T);
          break;
        }
      case zT.RCDATA_LESS_THAN_SIGN:
        {
          this._stateRcdataLessThanSign(T);
          break;
        }
      case zT.RCDATA_END_TAG_OPEN:
        {
          this._stateRcdataEndTagOpen(T);
          break;
        }
      case zT.RCDATA_END_TAG_NAME:
        {
          this._stateRcdataEndTagName(T);
          break;
        }
      case zT.RAWTEXT_LESS_THAN_SIGN:
        {
          this._stateRawtextLessThanSign(T);
          break;
        }
      case zT.RAWTEXT_END_TAG_OPEN:
        {
          this._stateRawtextEndTagOpen(T);
          break;
        }
      case zT.RAWTEXT_END_TAG_NAME:
        {
          this._stateRawtextEndTagName(T);
          break;
        }
      case zT.SCRIPT_DATA_LESS_THAN_SIGN:
        {
          this._stateScriptDataLessThanSign(T);
          break;
        }
      case zT.SCRIPT_DATA_END_TAG_OPEN:
        {
          this._stateScriptDataEndTagOpen(T);
          break;
        }
      case zT.SCRIPT_DATA_END_TAG_NAME:
        {
          this._stateScriptDataEndTagName(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPE_START:
        {
          this._stateScriptDataEscapeStart(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPE_START_DASH:
        {
          this._stateScriptDataEscapeStartDash(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED:
        {
          this._stateScriptDataEscaped(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED_DASH:
        {
          this._stateScriptDataEscapedDash(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED_DASH_DASH:
        {
          this._stateScriptDataEscapedDashDash(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
        {
          this._stateScriptDataEscapedLessThanSign(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
        {
          this._stateScriptDataEscapedEndTagOpen(T);
          break;
        }
      case zT.SCRIPT_DATA_ESCAPED_END_TAG_NAME:
        {
          this._stateScriptDataEscapedEndTagName(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPE_START:
        {
          this._stateScriptDataDoubleEscapeStart(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPED:
        {
          this._stateScriptDataDoubleEscaped(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
        {
          this._stateScriptDataDoubleEscapedDash(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
        {
          this._stateScriptDataDoubleEscapedDashDash(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
        {
          this._stateScriptDataDoubleEscapedLessThanSign(T);
          break;
        }
      case zT.SCRIPT_DATA_DOUBLE_ESCAPE_END:
        {
          this._stateScriptDataDoubleEscapeEnd(T);
          break;
        }
      case zT.BEFORE_ATTRIBUTE_NAME:
        {
          this._stateBeforeAttributeName(T);
          break;
        }
      case zT.ATTRIBUTE_NAME:
        {
          this._stateAttributeName(T);
          break;
        }
      case zT.AFTER_ATTRIBUTE_NAME:
        {
          this._stateAfterAttributeName(T);
          break;
        }
      case zT.BEFORE_ATTRIBUTE_VALUE:
        {
          this._stateBeforeAttributeValue(T);
          break;
        }
      case zT.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
        {
          this._stateAttributeValueDoubleQuoted(T);
          break;
        }
      case zT.ATTRIBUTE_VALUE_SINGLE_QUOTED:
        {
          this._stateAttributeValueSingleQuoted(T);
          break;
        }
      case zT.ATTRIBUTE_VALUE_UNQUOTED:
        {
          this._stateAttributeValueUnquoted(T);
          break;
        }
      case zT.AFTER_ATTRIBUTE_VALUE_QUOTED:
        {
          this._stateAfterAttributeValueQuoted(T);
          break;
        }
      case zT.SELF_CLOSING_START_TAG:
        {
          this._stateSelfClosingStartTag(T);
          break;
        }
      case zT.BOGUS_COMMENT:
        {
          this._stateBogusComment(T);
          break;
        }
      case zT.MARKUP_DECLARATION_OPEN:
        {
          this._stateMarkupDeclarationOpen(T);
          break;
        }
      case zT.COMMENT_START:
        {
          this._stateCommentStart(T);
          break;
        }
      case zT.COMMENT_START_DASH:
        {
          this._stateCommentStartDash(T);
          break;
        }
      case zT.COMMENT:
        {
          this._stateComment(T);
          break;
        }
      case zT.COMMENT_LESS_THAN_SIGN:
        {
          this._stateCommentLessThanSign(T);
          break;
        }
      case zT.COMMENT_LESS_THAN_SIGN_BANG:
        {
          this._stateCommentLessThanSignBang(T);
          break;
        }
      case zT.COMMENT_LESS_THAN_SIGN_BANG_DASH:
        {
          this._stateCommentLessThanSignBangDash(T);
          break;
        }
      case zT.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH:
        {
          this._stateCommentLessThanSignBangDashDash(T);
          break;
        }
      case zT.COMMENT_END_DASH:
        {
          this._stateCommentEndDash(T);
          break;
        }
      case zT.COMMENT_END:
        {
          this._stateCommentEnd(T);
          break;
        }
      case zT.COMMENT_END_BANG:
        {
          this._stateCommentEndBang(T);
          break;
        }
      case zT.DOCTYPE:
        {
          this._stateDoctype(T);
          break;
        }
      case zT.BEFORE_DOCTYPE_NAME:
        {
          this._stateBeforeDoctypeName(T);
          break;
        }
      case zT.DOCTYPE_NAME:
        {
          this._stateDoctypeName(T);
          break;
        }
      case zT.AFTER_DOCTYPE_NAME:
        {
          this._stateAfterDoctypeName(T);
          break;
        }
      case zT.AFTER_DOCTYPE_PUBLIC_KEYWORD:
        {
          this._stateAfterDoctypePublicKeyword(T);
          break;
        }
      case zT.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER:
        {
          this._stateBeforeDoctypePublicIdentifier(T);
          break;
        }
      case zT.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED:
        {
          this._stateDoctypePublicIdentifierDoubleQuoted(T);
          break;
        }
      case zT.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED:
        {
          this._stateDoctypePublicIdentifierSingleQuoted(T);
          break;
        }
      case zT.AFTER_DOCTYPE_PUBLIC_IDENTIFIER:
        {
          this._stateAfterDoctypePublicIdentifier(T);
          break;
        }
      case zT.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS:
        {
          this._stateBetweenDoctypePublicAndSystemIdentifiers(T);
          break;
        }
      case zT.AFTER_DOCTYPE_SYSTEM_KEYWORD:
        {
          this._stateAfterDoctypeSystemKeyword(T);
          break;
        }
      case zT.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER:
        {
          this._stateBeforeDoctypeSystemIdentifier(T);
          break;
        }
      case zT.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED:
        {
          this._stateDoctypeSystemIdentifierDoubleQuoted(T);
          break;
        }
      case zT.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED:
        {
          this._stateDoctypeSystemIdentifierSingleQuoted(T);
          break;
        }
      case zT.AFTER_DOCTYPE_SYSTEM_IDENTIFIER:
        {
          this._stateAfterDoctypeSystemIdentifier(T);
          break;
        }
      case zT.BOGUS_DOCTYPE:
        {
          this._stateBogusDoctype(T);
          break;
        }
      case zT.CDATA_SECTION:
        {
          this._stateCdataSection(T);
          break;
        }
      case zT.CDATA_SECTION_BRACKET:
        {
          this._stateCdataSectionBracket(T);
          break;
        }
      case zT.CDATA_SECTION_END:
        {
          this._stateCdataSectionEnd(T);
          break;
        }
      case zT.CHARACTER_REFERENCE:
        {
          this._stateCharacterReference();
          break;
        }
      case zT.AMBIGUOUS_AMPERSAND:
        {
          this._stateAmbiguousAmpersand(T);
          break;
        }
      default:
        throw Error("Unknown state");
    }
  }
  _stateData(T) {
    switch (T) {
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.TAG_OPEN;
          break;
        }
      case HT.AMPERSAND:
        {
          this._startCharacterReference();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitCodePoint(T);
          break;
        }
      case HT.EOF:
        {
          this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateRcdata(T) {
    switch (T) {
      case HT.AMPERSAND:
        {
          this._startCharacterReference();
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.RCDATA_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateRawtext(T) {
    switch (T) {
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.RAWTEXT_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateScriptData(T) {
    switch (T) {
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _statePlaintext(T) {
    switch (T) {
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateTagOpen(T) {
    if (Pl(T)) this._createStartTagToken(), this.state = zT.TAG_NAME, this._stateTagName(T);else switch (T) {
      case HT.EXCLAMATION_MARK:
        {
          this.state = zT.MARKUP_DECLARATION_OPEN;
          break;
        }
      case HT.SOLIDUS:
        {
          this.state = zT.END_TAG_OPEN;
          break;
        }
      case HT.QUESTION_MARK:
        {
          this._err(vR.unexpectedQuestionMarkInsteadOfTagName), this._createCommentToken(1), this.state = zT.BOGUS_COMMENT, this._stateBogusComment(T);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofBeforeTagName), this._emitChars("<"), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.invalidFirstCharacterOfTagName), this._emitChars("<"), this.state = zT.DATA, this._stateData(T);
    }
  }
  _stateEndTagOpen(T) {
    if (Pl(T)) this._createEndTagToken(), this.state = zT.TAG_NAME, this._stateTagName(T);else switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingEndTagName), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofBeforeTagName), this._emitChars("</"), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.invalidFirstCharacterOfTagName), this._createCommentToken(2), this.state = zT.BOGUS_COMMENT, this._stateBogusComment(T);
    }
  }
  _stateTagName(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.BEFORE_ATTRIBUTE_NAME;
          break;
        }
      case HT.SOLIDUS:
        {
          this.state = zT.SELF_CLOSING_START_TAG;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.tagName += M3;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        R.tagName += String.fromCodePoint(I$(T) ? q4(T) : T);
    }
  }
  _stateRcdataLessThanSign(T) {
    if (T === HT.SOLIDUS) this.state = zT.RCDATA_END_TAG_OPEN;else this._emitChars("<"), this.state = zT.RCDATA, this._stateRcdata(T);
  }
  _stateRcdataEndTagOpen(T) {
    if (Pl(T)) this.state = zT.RCDATA_END_TAG_NAME, this._stateRcdataEndTagName(T);else this._emitChars("</"), this.state = zT.RCDATA, this._stateRcdata(T);
  }
  handleSpecialEndTag(T) {
    if (!this.preprocessor.startsWith(this.lastStartTagName, !1)) return !this._ensureHibernation();
    this._createEndTagToken();
    let R = this.currentToken;
    switch (R.tagName = this.lastStartTagName, this.preprocessor.peek(this.lastStartTagName.length)) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        return this._advanceBy(this.lastStartTagName.length), this.state = zT.BEFORE_ATTRIBUTE_NAME, !1;
      case HT.SOLIDUS:
        return this._advanceBy(this.lastStartTagName.length), this.state = zT.SELF_CLOSING_START_TAG, !1;
      case HT.GREATER_THAN_SIGN:
        return this._advanceBy(this.lastStartTagName.length), this.emitCurrentTagToken(), this.state = zT.DATA, !1;
      default:
        return !this._ensureHibernation();
    }
  }
  _stateRcdataEndTagName(T) {
    if (this.handleSpecialEndTag(T)) this._emitChars("</"), this.state = zT.RCDATA, this._stateRcdata(T);
  }
  _stateRawtextLessThanSign(T) {
    if (T === HT.SOLIDUS) this.state = zT.RAWTEXT_END_TAG_OPEN;else this._emitChars("<"), this.state = zT.RAWTEXT, this._stateRawtext(T);
  }
  _stateRawtextEndTagOpen(T) {
    if (Pl(T)) this.state = zT.RAWTEXT_END_TAG_NAME, this._stateRawtextEndTagName(T);else this._emitChars("</"), this.state = zT.RAWTEXT, this._stateRawtext(T);
  }
  _stateRawtextEndTagName(T) {
    if (this.handleSpecialEndTag(T)) this._emitChars("</"), this.state = zT.RAWTEXT, this._stateRawtext(T);
  }
  _stateScriptDataLessThanSign(T) {
    switch (T) {
      case HT.SOLIDUS:
        {
          this.state = zT.SCRIPT_DATA_END_TAG_OPEN;
          break;
        }
      case HT.EXCLAMATION_MARK:
        {
          this.state = zT.SCRIPT_DATA_ESCAPE_START, this._emitChars("<!");
          break;
        }
      default:
        this._emitChars("<"), this.state = zT.SCRIPT_DATA, this._stateScriptData(T);
    }
  }
  _stateScriptDataEndTagOpen(T) {
    if (Pl(T)) this.state = zT.SCRIPT_DATA_END_TAG_NAME, this._stateScriptDataEndTagName(T);else this._emitChars("</"), this.state = zT.SCRIPT_DATA, this._stateScriptData(T);
  }
  _stateScriptDataEndTagName(T) {
    if (this.handleSpecialEndTag(T)) this._emitChars("</"), this.state = zT.SCRIPT_DATA, this._stateScriptData(T);
  }
  _stateScriptDataEscapeStart(T) {
    if (T === HT.HYPHEN_MINUS) this.state = zT.SCRIPT_DATA_ESCAPE_START_DASH, this._emitChars("-");else this.state = zT.SCRIPT_DATA, this._stateScriptData(T);
  }
  _stateScriptDataEscapeStartDash(T) {
    if (T === HT.HYPHEN_MINUS) this.state = zT.SCRIPT_DATA_ESCAPED_DASH_DASH, this._emitChars("-");else this.state = zT.SCRIPT_DATA, this._stateScriptData(T);
  }
  _stateScriptDataEscaped(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.SCRIPT_DATA_ESCAPED_DASH, this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateScriptDataEscapedDash(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.SCRIPT_DATA_ESCAPED_DASH_DASH, this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.state = zT.SCRIPT_DATA_ESCAPED, this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this.state = zT.SCRIPT_DATA_ESCAPED, this._emitCodePoint(T);
    }
  }
  _stateScriptDataEscapedDashDash(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA, this._emitChars(">");
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.state = zT.SCRIPT_DATA_ESCAPED, this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this.state = zT.SCRIPT_DATA_ESCAPED, this._emitCodePoint(T);
    }
  }
  _stateScriptDataEscapedLessThanSign(T) {
    if (T === HT.SOLIDUS) this.state = zT.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;else if (Pl(T)) this._emitChars("<"), this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPE_START, this._stateScriptDataDoubleEscapeStart(T);else this._emitChars("<"), this.state = zT.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(T);
  }
  _stateScriptDataEscapedEndTagOpen(T) {
    if (Pl(T)) this.state = zT.SCRIPT_DATA_ESCAPED_END_TAG_NAME, this._stateScriptDataEscapedEndTagName(T);else this._emitChars("</"), this.state = zT.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(T);
  }
  _stateScriptDataEscapedEndTagName(T) {
    if (this.handleSpecialEndTag(T)) this._emitChars("</"), this.state = zT.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(T);
  }
  _stateScriptDataDoubleEscapeStart(T) {
    if (this.preprocessor.startsWith(sr.SCRIPT, !1) && yfT(this.preprocessor.peek(sr.SCRIPT.length))) {
      this._emitCodePoint(T);
      for (let R = 0; R < sr.SCRIPT.length; R++) this._emitCodePoint(this._consume());
      this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED;
    } else if (!this._ensureHibernation()) this.state = zT.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(T);
  }
  _stateScriptDataDoubleEscaped(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED_DASH, this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateScriptDataDoubleEscapedDash(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH, this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitCodePoint(T);
    }
  }
  _stateScriptDataDoubleEscapedDashDash(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this._emitChars("-");
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.SCRIPT_DATA, this._emitChars(">");
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitChars(M3);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
          break;
        }
      default:
        this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitCodePoint(T);
    }
  }
  _stateScriptDataDoubleEscapedLessThanSign(T) {
    if (T === HT.SOLIDUS) this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPE_END, this._emitChars("/");else this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._stateScriptDataDoubleEscaped(T);
  }
  _stateScriptDataDoubleEscapeEnd(T) {
    if (this.preprocessor.startsWith(sr.SCRIPT, !1) && yfT(this.preprocessor.peek(sr.SCRIPT.length))) {
      this._emitCodePoint(T);
      for (let R = 0; R < sr.SCRIPT.length; R++) this._emitCodePoint(this._consume());
      this.state = zT.SCRIPT_DATA_ESCAPED;
    } else if (!this._ensureHibernation()) this.state = zT.SCRIPT_DATA_DOUBLE_ESCAPED, this._stateScriptDataDoubleEscaped(T);
  }
  _stateBeforeAttributeName(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.SOLIDUS:
      case HT.GREATER_THAN_SIGN:
      case HT.EOF:
        {
          this.state = zT.AFTER_ATTRIBUTE_NAME, this._stateAfterAttributeName(T);
          break;
        }
      case HT.EQUALS_SIGN:
        {
          this._err(vR.unexpectedEqualsSignBeforeAttributeName), this._createAttr("="), this.state = zT.ATTRIBUTE_NAME;
          break;
        }
      default:
        this._createAttr(""), this.state = zT.ATTRIBUTE_NAME, this._stateAttributeName(T);
    }
  }
  _stateAttributeName(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
      case HT.SOLIDUS:
      case HT.GREATER_THAN_SIGN:
      case HT.EOF:
        {
          this._leaveAttrName(), this.state = zT.AFTER_ATTRIBUTE_NAME, this._stateAfterAttributeName(T);
          break;
        }
      case HT.EQUALS_SIGN:
        {
          this._leaveAttrName(), this.state = zT.BEFORE_ATTRIBUTE_VALUE;
          break;
        }
      case HT.QUOTATION_MARK:
      case HT.APOSTROPHE:
      case HT.LESS_THAN_SIGN:
        {
          this._err(vR.unexpectedCharacterInAttributeName), this.currentAttr.name += String.fromCodePoint(T);
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.currentAttr.name += M3;
          break;
        }
      default:
        this.currentAttr.name += String.fromCodePoint(I$(T) ? q4(T) : T);
    }
  }
  _stateAfterAttributeName(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.SOLIDUS:
        {
          this.state = zT.SELF_CLOSING_START_TAG;
          break;
        }
      case HT.EQUALS_SIGN:
        {
          this.state = zT.BEFORE_ATTRIBUTE_VALUE;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this._createAttr(""), this.state = zT.ATTRIBUTE_NAME, this._stateAttributeName(T);
    }
  }
  _stateBeforeAttributeValue(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.QUOTATION_MARK:
        {
          this.state = zT.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          this.state = zT.ATTRIBUTE_VALUE_SINGLE_QUOTED;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingAttributeValue), this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      default:
        this.state = zT.ATTRIBUTE_VALUE_UNQUOTED, this._stateAttributeValueUnquoted(T);
    }
  }
  _stateAttributeValueDoubleQuoted(T) {
    switch (T) {
      case HT.QUOTATION_MARK:
        {
          this.state = zT.AFTER_ATTRIBUTE_VALUE_QUOTED;
          break;
        }
      case HT.AMPERSAND:
        {
          this._startCharacterReference();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.currentAttr.value += M3;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this.currentAttr.value += String.fromCodePoint(T);
    }
  }
  _stateAttributeValueSingleQuoted(T) {
    switch (T) {
      case HT.APOSTROPHE:
        {
          this.state = zT.AFTER_ATTRIBUTE_VALUE_QUOTED;
          break;
        }
      case HT.AMPERSAND:
        {
          this._startCharacterReference();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.currentAttr.value += M3;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this.currentAttr.value += String.fromCodePoint(T);
    }
  }
  _stateAttributeValueUnquoted(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this._leaveAttrValue(), this.state = zT.BEFORE_ATTRIBUTE_NAME;
          break;
        }
      case HT.AMPERSAND:
        {
          this._startCharacterReference();
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._leaveAttrValue(), this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this.currentAttr.value += M3;
          break;
        }
      case HT.QUOTATION_MARK:
      case HT.APOSTROPHE:
      case HT.LESS_THAN_SIGN:
      case HT.EQUALS_SIGN:
      case HT.GRAVE_ACCENT:
        {
          this._err(vR.unexpectedCharacterInUnquotedAttributeValue), this.currentAttr.value += String.fromCodePoint(T);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this.currentAttr.value += String.fromCodePoint(T);
    }
  }
  _stateAfterAttributeValueQuoted(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this._leaveAttrValue(), this.state = zT.BEFORE_ATTRIBUTE_NAME;
          break;
        }
      case HT.SOLIDUS:
        {
          this._leaveAttrValue(), this.state = zT.SELF_CLOSING_START_TAG;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._leaveAttrValue(), this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingWhitespaceBetweenAttributes), this.state = zT.BEFORE_ATTRIBUTE_NAME, this._stateBeforeAttributeName(T);
    }
  }
  _stateSelfClosingStartTag(T) {
    switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          let R = this.currentToken;
          R.selfClosing = !0, this.state = zT.DATA, this.emitCurrentTagToken();
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInTag), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.unexpectedSolidusInTag), this.state = zT.BEFORE_ATTRIBUTE_NAME, this._stateBeforeAttributeName(T);
    }
  }
  _stateBogusComment(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentComment(R);
          break;
        }
      case HT.EOF:
        {
          this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.data += M3;
          break;
        }
      default:
        R.data += String.fromCodePoint(T);
    }
  }
  _stateMarkupDeclarationOpen(T) {
    if (this._consumeSequenceIfMatch(sr.DASH_DASH, !0)) this._createCommentToken(sr.DASH_DASH.length + 1), this.state = zT.COMMENT_START;else if (this._consumeSequenceIfMatch(sr.DOCTYPE, !1)) this.currentLocation = this.getCurrentLocation(sr.DOCTYPE.length + 1), this.state = zT.DOCTYPE;else if (this._consumeSequenceIfMatch(sr.CDATA_START, !0)) {
      if (this.inForeignNode) this.state = zT.CDATA_SECTION;else this._err(vR.cdataInHtmlContent), this._createCommentToken(sr.CDATA_START.length + 1), this.currentToken.data = "[CDATA[", this.state = zT.BOGUS_COMMENT;
    } else if (!this._ensureHibernation()) this._err(vR.incorrectlyOpenedComment), this._createCommentToken(2), this.state = zT.BOGUS_COMMENT, this._stateBogusComment(T);
  }
  _stateCommentStart(T) {
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.COMMENT_START_DASH;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptClosingOfEmptyComment), this.state = zT.DATA;
          let R = this.currentToken;
          this.emitCurrentComment(R);
          break;
        }
      default:
        this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateCommentStartDash(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.COMMENT_END;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptClosingOfEmptyComment), this.state = zT.DATA, this.emitCurrentComment(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInComment), this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      default:
        R.data += "-", this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateComment(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.COMMENT_END_DASH;
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          R.data += "<", this.state = zT.COMMENT_LESS_THAN_SIGN;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.data += M3;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInComment), this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      default:
        R.data += String.fromCodePoint(T);
    }
  }
  _stateCommentLessThanSign(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.EXCLAMATION_MARK:
        {
          R.data += "!", this.state = zT.COMMENT_LESS_THAN_SIGN_BANG;
          break;
        }
      case HT.LESS_THAN_SIGN:
        {
          R.data += "<";
          break;
        }
      default:
        this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateCommentLessThanSignBang(T) {
    if (T === HT.HYPHEN_MINUS) this.state = zT.COMMENT_LESS_THAN_SIGN_BANG_DASH;else this.state = zT.COMMENT, this._stateComment(T);
  }
  _stateCommentLessThanSignBangDash(T) {
    if (T === HT.HYPHEN_MINUS) this.state = zT.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;else this.state = zT.COMMENT_END_DASH, this._stateCommentEndDash(T);
  }
  _stateCommentLessThanSignBangDashDash(T) {
    if (T !== HT.GREATER_THAN_SIGN && T !== HT.EOF) this._err(vR.nestedComment);
    this.state = zT.COMMENT_END, this._stateCommentEnd(T);
  }
  _stateCommentEndDash(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          this.state = zT.COMMENT_END;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInComment), this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      default:
        R.data += "-", this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateCommentEnd(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentComment(R);
          break;
        }
      case HT.EXCLAMATION_MARK:
        {
          this.state = zT.COMMENT_END_BANG;
          break;
        }
      case HT.HYPHEN_MINUS:
        {
          R.data += "-";
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInComment), this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      default:
        R.data += "--", this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateCommentEndBang(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.HYPHEN_MINUS:
        {
          R.data += "--!", this.state = zT.COMMENT_END_DASH;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.incorrectlyClosedComment), this.state = zT.DATA, this.emitCurrentComment(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInComment), this.emitCurrentComment(R), this._emitEOFToken();
          break;
        }
      default:
        R.data += "--!", this.state = zT.COMMENT, this._stateComment(T);
    }
  }
  _stateDoctype(T) {
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.BEFORE_DOCTYPE_NAME;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.BEFORE_DOCTYPE_NAME, this._stateBeforeDoctypeName(T);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), this._createDoctypeToken(null);
          let R = this.currentToken;
          R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingWhitespaceBeforeDoctypeName), this.state = zT.BEFORE_DOCTYPE_NAME, this._stateBeforeDoctypeName(T);
    }
  }
  _stateBeforeDoctypeName(T) {
    if (I$(T)) this._createDoctypeToken(String.fromCharCode(q4(T))), this.state = zT.DOCTYPE_NAME;else switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), this._createDoctypeToken(M3), this.state = zT.DOCTYPE_NAME;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingDoctypeName), this._createDoctypeToken(null);
          let R = this.currentToken;
          R.forceQuirks = !0, this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), this._createDoctypeToken(null);
          let R = this.currentToken;
          R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._createDoctypeToken(String.fromCodePoint(T)), this.state = zT.DOCTYPE_NAME;
    }
  }
  _stateDoctypeName(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.AFTER_DOCTYPE_NAME;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.name += M3;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        R.name += String.fromCodePoint(I$(T) ? q4(T) : T);
    }
  }
  _stateAfterDoctypeName(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        if (this._consumeSequenceIfMatch(sr.PUBLIC, !1)) this.state = zT.AFTER_DOCTYPE_PUBLIC_KEYWORD;else if (this._consumeSequenceIfMatch(sr.SYSTEM, !1)) this.state = zT.AFTER_DOCTYPE_SYSTEM_KEYWORD;else if (!this._ensureHibernation()) this._err(vR.invalidCharacterSequenceAfterDoctypeName), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateAfterDoctypePublicKeyword(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
          break;
        }
      case HT.QUOTATION_MARK:
        {
          this._err(vR.missingWhitespaceAfterDoctypePublicKeyword), R.publicId = "", this.state = zT.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          this._err(vR.missingWhitespaceAfterDoctypePublicKeyword), R.publicId = "", this.state = zT.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingDoctypePublicIdentifier), R.forceQuirks = !0, this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypePublicIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateBeforeDoctypePublicIdentifier(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.QUOTATION_MARK:
        {
          R.publicId = "", this.state = zT.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          R.publicId = "", this.state = zT.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingDoctypePublicIdentifier), R.forceQuirks = !0, this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypePublicIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateDoctypePublicIdentifierDoubleQuoted(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.QUOTATION_MARK:
        {
          this.state = zT.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.publicId += M3;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptDoctypePublicIdentifier), R.forceQuirks = !0, this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        R.publicId += String.fromCodePoint(T);
    }
  }
  _stateDoctypePublicIdentifierSingleQuoted(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.APOSTROPHE:
        {
          this.state = zT.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.publicId += M3;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptDoctypePublicIdentifier), R.forceQuirks = !0, this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        R.publicId += String.fromCodePoint(T);
    }
  }
  _stateAfterDoctypePublicIdentifier(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.QUOTATION_MARK:
        {
          this._err(vR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers), R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          this._err(vR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers), R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateBetweenDoctypePublicAndSystemIdentifiers(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.GREATER_THAN_SIGN:
        {
          this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.QUOTATION_MARK:
        {
          R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateAfterDoctypeSystemKeyword(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        {
          this.state = zT.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
          break;
        }
      case HT.QUOTATION_MARK:
        {
          this._err(vR.missingWhitespaceAfterDoctypeSystemKeyword), R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          this._err(vR.missingWhitespaceAfterDoctypeSystemKeyword), R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateBeforeDoctypeSystemIdentifier(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.QUOTATION_MARK:
        {
          R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
          break;
        }
      case HT.APOSTROPHE:
        {
          R.systemId = "", this.state = zT.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.missingDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.DATA, this.emitCurrentDoctype(R);
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.missingQuoteBeforeDoctypeSystemIdentifier), R.forceQuirks = !0, this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateDoctypeSystemIdentifierDoubleQuoted(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.QUOTATION_MARK:
        {
          this.state = zT.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.systemId += M3;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptDoctypeSystemIdentifier), R.forceQuirks = !0, this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        R.systemId += String.fromCodePoint(T);
    }
  }
  _stateDoctypeSystemIdentifierSingleQuoted(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.APOSTROPHE:
        {
          this.state = zT.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter), R.systemId += M3;
          break;
        }
      case HT.GREATER_THAN_SIGN:
        {
          this._err(vR.abruptDoctypeSystemIdentifier), R.forceQuirks = !0, this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        R.systemId += String.fromCodePoint(T);
    }
  }
  _stateAfterDoctypeSystemIdentifier(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.SPACE:
      case HT.LINE_FEED:
      case HT.TABULATION:
      case HT.FORM_FEED:
        break;
      case HT.GREATER_THAN_SIGN:
        {
          this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInDoctype), R.forceQuirks = !0, this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
        this._err(vR.unexpectedCharacterAfterDoctypeSystemIdentifier), this.state = zT.BOGUS_DOCTYPE, this._stateBogusDoctype(T);
    }
  }
  _stateBogusDoctype(T) {
    let R = this.currentToken;
    switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          this.emitCurrentDoctype(R), this.state = zT.DATA;
          break;
        }
      case HT.NULL:
        {
          this._err(vR.unexpectedNullCharacter);
          break;
        }
      case HT.EOF:
        {
          this.emitCurrentDoctype(R), this._emitEOFToken();
          break;
        }
      default:
    }
  }
  _stateCdataSection(T) {
    switch (T) {
      case HT.RIGHT_SQUARE_BRACKET:
        {
          this.state = zT.CDATA_SECTION_BRACKET;
          break;
        }
      case HT.EOF:
        {
          this._err(vR.eofInCdata), this._emitEOFToken();
          break;
        }
      default:
        this._emitCodePoint(T);
    }
  }
  _stateCdataSectionBracket(T) {
    if (T === HT.RIGHT_SQUARE_BRACKET) this.state = zT.CDATA_SECTION_END;else this._emitChars("]"), this.state = zT.CDATA_SECTION, this._stateCdataSection(T);
  }
  _stateCdataSectionEnd(T) {
    switch (T) {
      case HT.GREATER_THAN_SIGN:
        {
          this.state = zT.DATA;
          break;
        }
      case HT.RIGHT_SQUARE_BRACKET:
        {
          this._emitChars("]");
          break;
        }
      default:
        this._emitChars("]]"), this.state = zT.CDATA_SECTION, this._stateCdataSection(T);
    }
  }
  _stateCharacterReference() {
    let T = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
    if (T < 0) if (this.preprocessor.lastChunkWritten) T = this.entityDecoder.end();else {
      this.active = !1, this.preprocessor.pos = this.preprocessor.html.length - 1, this.consumedAfterSnapshot = 0, this.preprocessor.endOfChunkHit = !0;
      return;
    }
    if (T === 0) this.preprocessor.pos = this.entityStartPos, this._flushCodePointConsumedAsCharacterReference(HT.AMPERSAND), this.state = !this._isCharacterReferenceInAttribute() && ufT(this.preprocessor.peek(1)) ? zT.AMBIGUOUS_AMPERSAND : this.returnState;else this.state = this.returnState;
  }
  _stateAmbiguousAmpersand(T) {
    if (ufT(T)) this._flushCodePointConsumedAsCharacterReference(T);else {
      if (T === HT.SEMICOLON) this._err(vR.unknownNamedCharacterReference);
      this.state = this.returnState, this._callState(T);
    }
  }
}