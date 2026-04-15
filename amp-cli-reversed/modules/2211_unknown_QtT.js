function TI0(T, R, a, e) {
  return (!e || e === VR.HTML) && Jf0(T, R, a) || (!e || e === VR.MATHML) && Zf0(T, R);
}
class QtT {
  constructor(T, R, a = null, e = null) {
    if (this.fragmentContext = a, this.scriptHandler = e, this.currentToken = null, this.stopped = !1, this.insertionMode = YT.INITIAL, this.originalInsertionMode = YT.INITIAL, this.headElement = null, this.formElement = null, this.currentNotInHTML = !1, this.tmplInsertionModeStack = [], this.pendingCharacterTokens = [], this.hasNonWhitespacePendingCharacterToken = !1, this.framesetOk = !0, this.skipNextNewLine = !1, this.fosterParentingEnabled = !1, this.options = {
      ...$fT,
      ...T
    }, this.treeAdapter = this.options.treeAdapter, this.onParseError = this.options.onParseError, this.onParseError) this.options.sourceCodeLocationInfo = !0;
    this.document = R !== null && R !== void 0 ? R : this.treeAdapter.createDocument(), this.tokenizer = new bYT(this.options, this), this.activeFormattingElements = new yYT(this.treeAdapter), this.fragmentContextID = a ? DH(this.treeAdapter.getTagName(a)) : sT.UNKNOWN, this._setContextModes(a !== null && a !== void 0 ? a : this.document, this.fragmentContextID), this.openElements = new uYT(this.document, this.treeAdapter, this);
  }
  static parse(T, R) {
    let a = new this(R);
    return a.tokenizer.write(T, !0), a.document;
  }
  static getFragmentParser(T, R) {
    let a = {
      ...$fT,
      ...R
    };
    T !== null && T !== void 0 || (T = a.treeAdapter.createElement(pR.TEMPLATE, VR.HTML, []));
    let e = a.treeAdapter.createElement("documentmock", VR.HTML, []),
      t = new this(a, e, T);
    if (t.fragmentContextID === sT.TEMPLATE) t.tmplInsertionModeStack.unshift(YT.IN_TEMPLATE);
    return t._initTokenizerForFragmentParsing(), t._insertFakeRootElement(), t._resetInsertionMode(), t._findFormInFragmentContext(), t;
  }
  getFragment() {
    let T = this.treeAdapter.getFirstChild(this.document),
      R = this.treeAdapter.createDocumentFragment();
    return this._adoptNodes(T, R), R;
  }
  _err(T, R, a) {
    var e;
    if (!this.onParseError) return;
    let t = (e = T.location) !== null && e !== void 0 ? e : tI0,
      r = {
        code: R,
        startLine: t.startLine,
        startCol: t.startCol,
        startOffset: t.startOffset,
        endLine: a ? t.startLine : t.endLine,
        endCol: a ? t.startCol : t.endCol,
        endOffset: a ? t.startOffset : t.endOffset
      };
    this.onParseError(r);
  }
  onItemPush(T, R, a) {
    var e, t;
    if ((t = (e = this.treeAdapter).onItemPush) === null || t === void 0 || t.call(e, T), a && this.openElements.stackTop > 0) this._setContextModes(T, R);
  }
  onItemPop(T, R) {
    var a, e;
    if (this.options.sourceCodeLocationInfo) this._setEndLocation(T, this.currentToken);
    if ((e = (a = this.treeAdapter).onItemPop) === null || e === void 0 || e.call(a, T, this.openElements.current), R) {
      let t, r;
      if (this.openElements.stackTop === 0 && this.fragmentContext) t = this.fragmentContext, r = this.fragmentContextID;else ({
        current: t,
        currentTagId: r
      } = this.openElements);
      this._setContextModes(t, r);
    }
  }
  _setContextModes(T, R) {
    let a = T === this.document || this.treeAdapter.getNamespaceURI(T) === VR.HTML;
    this.currentNotInHTML = !a, this.tokenizer.inForeignNode = !a && !this._isIntegrationPoint(R, T);
  }
  _switchToTextParsing(T, R) {
    this._insertElement(T, VR.HTML), this.tokenizer.state = R, this.originalInsertionMode = this.insertionMode, this.insertionMode = YT.TEXT;
  }
  switchToPlaintextParsing() {
    this.insertionMode = YT.TEXT, this.originalInsertionMode = YT.IN_BODY, this.tokenizer.state = gr.PLAINTEXT;
  }
  _getAdjustedCurrentElement() {
    return this.openElements.stackTop === 0 && this.fragmentContext ? this.fragmentContext : this.openElements.current;
  }
  _findFormInFragmentContext() {
    let T = this.fragmentContext;
    while (T) {
      if (this.treeAdapter.getTagName(T) === pR.FORM) {
        this.formElement = T;
        break;
      }
      T = this.treeAdapter.getParentNode(T);
    }
  }
  _initTokenizerForFragmentParsing() {
    if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== VR.HTML) return;
    switch (this.fragmentContextID) {
      case sT.TITLE:
      case sT.TEXTAREA:
        {
          this.tokenizer.state = gr.RCDATA;
          break;
        }
      case sT.STYLE:
      case sT.XMP:
      case sT.IFRAME:
      case sT.NOEMBED:
      case sT.NOFRAMES:
      case sT.NOSCRIPT:
        {
          this.tokenizer.state = gr.RAWTEXT;
          break;
        }
      case sT.SCRIPT:
        {
          this.tokenizer.state = gr.SCRIPT_DATA;
          break;
        }
      case sT.PLAINTEXT:
        {
          this.tokenizer.state = gr.PLAINTEXT;
          break;
        }
      default:
    }
  }
  _setDocumentType(T) {
    let R = T.name || "",
      a = T.publicId || "",
      e = T.systemId || "";
    if (this.treeAdapter.setDocumentType(this.document, R, a, e), T.location) {
      let t = this.treeAdapter.getChildNodes(this.document).find(r => this.treeAdapter.isDocumentTypeNode(r));
      if (t) this.treeAdapter.setNodeSourceCodeLocation(t, T.location);
    }
  }
  _attachElementToTree(T, R) {
    if (this.options.sourceCodeLocationInfo) {
      let a = R && {
        ...R,
        startTag: R
      };
      this.treeAdapter.setNodeSourceCodeLocation(T, a);
    }
    if (this._shouldFosterParentOnInsertion()) this._fosterParentElement(T);else {
      let a = this.openElements.currentTmplContentOrNode;
      this.treeAdapter.appendChild(a, T);
    }
  }
  _appendElement(T, R) {
    let a = this.treeAdapter.createElement(T.tagName, R, T.attrs);
    this._attachElementToTree(a, T.location);
  }
  _insertElement(T, R) {
    let a = this.treeAdapter.createElement(T.tagName, R, T.attrs);
    this._attachElementToTree(a, T.location), this.openElements.push(a, T.tagID);
  }
  _insertFakeElement(T, R) {
    let a = this.treeAdapter.createElement(T, VR.HTML, []);
    this._attachElementToTree(a, null), this.openElements.push(a, R);
  }
  _insertTemplate(T) {
    let R = this.treeAdapter.createElement(T.tagName, VR.HTML, T.attrs),
      a = this.treeAdapter.createDocumentFragment();
    if (this.treeAdapter.setTemplateContent(R, a), this._attachElementToTree(R, T.location), this.openElements.push(R, T.tagID), this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(a, null);
  }
  _insertFakeRootElement() {
    let T = this.treeAdapter.createElement(pR.HTML, VR.HTML, []);
    if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(T, null);
    this.treeAdapter.appendChild(this.openElements.current, T), this.openElements.push(T, sT.HTML);
  }
  _appendCommentNode(T, R) {
    let a = this.treeAdapter.createCommentNode(T.data);
    if (this.treeAdapter.appendChild(R, a), this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(a, T.location);
  }
  _insertCharacters(T) {
    let R, a;
    if (this._shouldFosterParentOnInsertion()) {
      if ({
        parent: R,
        beforeElement: a
      } = this._findFosterParentingLocation(), a) this.treeAdapter.insertTextBefore(R, T.chars, a);else this.treeAdapter.insertText(R, T.chars);
    } else R = this.openElements.currentTmplContentOrNode, this.treeAdapter.insertText(R, T.chars);
    if (!T.location) return;
    let e = this.treeAdapter.getChildNodes(R),
      t = a ? e.lastIndexOf(a) : e.length,
      r = e[t - 1];
    if (this.treeAdapter.getNodeSourceCodeLocation(r)) {
      let {
        endLine: h,
        endCol: i,
        endOffset: c
      } = T.location;
      this.treeAdapter.updateNodeSourceCodeLocation(r, {
        endLine: h,
        endCol: i,
        endOffset: c
      });
    } else if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(r, T.location);
  }
  _adoptNodes(T, R) {
    for (let a = this.treeAdapter.getFirstChild(T); a; a = this.treeAdapter.getFirstChild(T)) this.treeAdapter.detachNode(a), this.treeAdapter.appendChild(R, a);
  }
  _setEndLocation(T, R) {
    if (this.treeAdapter.getNodeSourceCodeLocation(T) && R.location) {
      let a = R.location,
        e = this.treeAdapter.getTagName(T),
        t = R.type === u8.END_TAG && e === R.tagName ? {
          endTag: {
            ...a
          },
          endLine: a.endLine,
          endCol: a.endCol,
          endOffset: a.endOffset
        } : {
          endLine: a.startLine,
          endCol: a.startCol,
          endOffset: a.startOffset
        };
      this.treeAdapter.updateNodeSourceCodeLocation(T, t);
    }
  }
  shouldProcessStartTagTokenInForeignContent(T) {
    if (!this.currentNotInHTML) return !1;
    let R, a;
    if (this.openElements.stackTop === 0 && this.fragmentContext) R = this.fragmentContext, a = this.fragmentContextID;else ({
      current: R,
      currentTagId: a
    } = this.openElements);
    if (T.tagID === sT.SVG && this.treeAdapter.getTagName(R) === pR.ANNOTATION_XML && this.treeAdapter.getNamespaceURI(R) === VR.MATHML) return !1;
    return this.tokenizer.inForeignNode || (T.tagID === sT.MGLYPH || T.tagID === sT.MALIGNMARK) && !this._isIntegrationPoint(a, R, VR.HTML);
  }
  _processToken(T) {
    switch (T.type) {
      case u8.CHARACTER:
        {
          this.onCharacter(T);
          break;
        }
      case u8.NULL_CHARACTER:
        {
          this.onNullCharacter(T);
          break;
        }
      case u8.COMMENT:
        {
          this.onComment(T);
          break;
        }
      case u8.DOCTYPE:
        {
          this.onDoctype(T);
          break;
        }
      case u8.START_TAG:
        {
          this._processStartTag(T);
          break;
        }
      case u8.END_TAG:
        {
          this.onEndTag(T);
          break;
        }
      case u8.EOF:
        {
          this.onEof(T);
          break;
        }
      case u8.WHITESPACE_CHARACTER:
        {
          this.onWhitespaceCharacter(T);
          break;
        }
    }
  }
  _isIntegrationPoint(T, R, a) {
    let e = this.treeAdapter.getNamespaceURI(R),
      t = this.treeAdapter.getAttrList(R);
    return TI0(T, e, t, a);
  }
  _reconstructActiveFormattingElements() {
    let T = this.activeFormattingElements.entries.length;
    if (T) {
      let R = this.activeFormattingElements.entries.findIndex(e => e.type === us.Marker || this.openElements.contains(e.element)),
        a = R < 0 ? T - 1 : R - 1;
      for (let e = a; e >= 0; e--) {
        let t = this.activeFormattingElements.entries[e];
        this._insertElement(t.token, this.treeAdapter.getNamespaceURI(t.element)), t.element = this.openElements.current;
      }
    }
  }
  _closeTableCell() {
    this.openElements.generateImpliedEndTags(), this.openElements.popUntilTableCellPopped(), this.activeFormattingElements.clearToLastMarker(), this.insertionMode = YT.IN_ROW;
  }
  _closePElement() {
    this.openElements.generateImpliedEndTagsWithExclusion(sT.P), this.openElements.popUntilTagNamePopped(sT.P);
  }
  _resetInsertionMode() {
    for (let T = this.openElements.stackTop; T >= 0; T--) switch (T === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[T]) {
      case sT.TR:
        {
          this.insertionMode = YT.IN_ROW;
          return;
        }
      case sT.TBODY:
      case sT.THEAD:
      case sT.TFOOT:
        {
          this.insertionMode = YT.IN_TABLE_BODY;
          return;
        }
      case sT.CAPTION:
        {
          this.insertionMode = YT.IN_CAPTION;
          return;
        }
      case sT.COLGROUP:
        {
          this.insertionMode = YT.IN_COLUMN_GROUP;
          return;
        }
      case sT.TABLE:
        {
          this.insertionMode = YT.IN_TABLE;
          return;
        }
      case sT.BODY:
        {
          this.insertionMode = YT.IN_BODY;
          return;
        }
      case sT.FRAMESET:
        {
          this.insertionMode = YT.IN_FRAMESET;
          return;
        }
      case sT.SELECT:
        {
          this._resetInsertionModeForSelect(T);
          return;
        }
      case sT.TEMPLATE:
        {
          this.insertionMode = this.tmplInsertionModeStack[0];
          return;
        }
      case sT.HTML:
        {
          this.insertionMode = this.headElement ? YT.AFTER_HEAD : YT.BEFORE_HEAD;
          return;
        }
      case sT.TD:
      case sT.TH:
        {
          if (T > 0) {
            this.insertionMode = YT.IN_CELL;
            return;
          }
          break;
        }
      case sT.HEAD:
        {
          if (T > 0) {
            this.insertionMode = YT.IN_HEAD;
            return;
          }
          break;
        }
    }
    this.insertionMode = YT.IN_BODY;
  }
  _resetInsertionModeForSelect(T) {
    if (T > 0) for (let R = T - 1; R > 0; R--) {
      let a = this.openElements.tagIDs[R];
      if (a === sT.TEMPLATE) break;else if (a === sT.TABLE) {
        this.insertionMode = YT.IN_SELECT_IN_TABLE;
        return;
      }
    }
    this.insertionMode = YT.IN_SELECT;
  }
  _isElementCausesFosterParenting(T) {
    return gYT.has(T);
  }
  _shouldFosterParentOnInsertion() {
    return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.currentTagId);
  }
  _findFosterParentingLocation() {
    for (let T = this.openElements.stackTop; T >= 0; T--) {
      let R = this.openElements.items[T];
      switch (this.openElements.tagIDs[T]) {
        case sT.TEMPLATE:
          {
            if (this.treeAdapter.getNamespaceURI(R) === VR.HTML) return {
              parent: this.treeAdapter.getTemplateContent(R),
              beforeElement: null
            };
            break;
          }
        case sT.TABLE:
          {
            let a = this.treeAdapter.getParentNode(R);
            if (a) return {
              parent: a,
              beforeElement: R
            };
            return {
              parent: this.openElements.items[T - 1],
              beforeElement: null
            };
          }
        default:
      }
    }
    return {
      parent: this.openElements.items[0],
      beforeElement: null
    };
  }
  _fosterParentElement(T) {
    let R = this._findFosterParentingLocation();
    if (R.beforeElement) this.treeAdapter.insertBefore(R.parent, T, R.beforeElement);else this.treeAdapter.appendChild(R.parent, T);
  }
  _isSpecialElement(T, R) {
    let a = this.treeAdapter.getNamespaceURI(T);
    return vf0[a].has(R);
  }
  onCharacter(T) {
    if (this.skipNextNewLine = !1, this.tokenizer.inForeignNode) {
      Lg0(this, T);
      return;
    }
    switch (this.insertionMode) {
      case YT.INITIAL:
        {
          kg(this, T);
          break;
        }
      case YT.BEFORE_HTML:
        {
          Ev(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
        {
          Cv(this, T);
          break;
        }
      case YT.IN_HEAD:
        {
          Lv(this, T);
          break;
        }
      case YT.IN_HEAD_NO_SCRIPT:
        {
          Mv(this, T);
          break;
        }
      case YT.AFTER_HEAD:
        {
          Dv(this, T);
          break;
        }
      case YT.IN_BODY:
      case YT.IN_CAPTION:
      case YT.IN_CELL:
      case YT.IN_TEMPLATE:
        {
          vYT(this, T);
          break;
        }
      case YT.TEXT:
      case YT.IN_SELECT:
      case YT.IN_SELECT_IN_TABLE:
        {
          this._insertCharacters(T);
          break;
        }
      case YT.IN_TABLE:
      case YT.IN_TABLE_BODY:
      case YT.IN_ROW:
        {
          jF(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          CYT(this, T);
          break;
        }
      case YT.IN_COLUMN_GROUP:
        {
          Qw(this, T);
          break;
        }
      case YT.AFTER_BODY:
        {
          Zw(this, T);
          break;
        }
      case YT.AFTER_AFTER_BODY:
        {
          HM(this, T);
          break;
        }
      default:
    }
  }
  onNullCharacter(T) {
    if (this.skipNextNewLine = !1, this.tokenizer.inForeignNode) {
      Cg0(this, T);
      return;
    }
    switch (this.insertionMode) {
      case YT.INITIAL:
        {
          kg(this, T);
          break;
        }
      case YT.BEFORE_HTML:
        {
          Ev(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
        {
          Cv(this, T);
          break;
        }
      case YT.IN_HEAD:
        {
          Lv(this, T);
          break;
        }
      case YT.IN_HEAD_NO_SCRIPT:
        {
          Mv(this, T);
          break;
        }
      case YT.AFTER_HEAD:
        {
          Dv(this, T);
          break;
        }
      case YT.TEXT:
        {
          this._insertCharacters(T);
          break;
        }
      case YT.IN_TABLE:
      case YT.IN_TABLE_BODY:
      case YT.IN_ROW:
        {
          jF(this, T);
          break;
        }
      case YT.IN_COLUMN_GROUP:
        {
          Qw(this, T);
          break;
        }
      case YT.AFTER_BODY:
        {
          Zw(this, T);
          break;
        }
      case YT.AFTER_AFTER_BODY:
        {
          HM(this, T);
          break;
        }
      default:
    }
  }
  onComment(T) {
    if (this.skipNextNewLine = !1, this.currentNotInHTML) {
      zY(this, T);
      return;
    }
    switch (this.insertionMode) {
      case YT.INITIAL:
      case YT.BEFORE_HTML:
      case YT.BEFORE_HEAD:
      case YT.IN_HEAD:
      case YT.IN_HEAD_NO_SCRIPT:
      case YT.AFTER_HEAD:
      case YT.IN_BODY:
      case YT.IN_TABLE:
      case YT.IN_CAPTION:
      case YT.IN_COLUMN_GROUP:
      case YT.IN_TABLE_BODY:
      case YT.IN_ROW:
      case YT.IN_CELL:
      case YT.IN_SELECT:
      case YT.IN_SELECT_IN_TABLE:
      case YT.IN_TEMPLATE:
      case YT.IN_FRAMESET:
      case YT.AFTER_FRAMESET:
        {
          zY(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          xg(this, T);
          break;
        }
      case YT.AFTER_BODY:
        {
          nI0(this, T);
          break;
        }
      case YT.AFTER_AFTER_BODY:
      case YT.AFTER_AFTER_FRAMESET:
        {
          lI0(this, T);
          break;
        }
      default:
    }
  }
  onDoctype(T) {
    switch (this.skipNextNewLine = !1, this.insertionMode) {
      case YT.INITIAL:
        {
          AI0(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
      case YT.IN_HEAD:
      case YT.IN_HEAD_NO_SCRIPT:
      case YT.AFTER_HEAD:
        {
          this._err(T, vR.misplacedDoctype);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          xg(this, T);
          break;
        }
      default:
    }
  }
  onStartTag(T) {
    if (this.skipNextNewLine = !1, this.currentToken = T, this._processStartTag(T), T.selfClosing && !T.ackSelfClosing) this._err(T, vR.nonVoidHtmlElementStartTagWithTrailingSolidus);
  }
  _processStartTag(T) {
    if (this.shouldProcessStartTagTokenInForeignContent(T)) Mg0(this, T);else this._startTagOutsideForeignContent(T);
  }
  _startTagOutsideForeignContent(T) {
    switch (this.insertionMode) {
      case YT.INITIAL:
        {
          kg(this, T);
          break;
        }
      case YT.BEFORE_HTML:
        {
          pI0(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
        {
          bI0(this, T);
          break;
        }
      case YT.IN_HEAD:
        {
          Bc(this, T);
          break;
        }
      case YT.IN_HEAD_NO_SCRIPT:
        {
          yI0(this, T);
          break;
        }
      case YT.AFTER_HEAD:
        {
          kI0(this, T);
          break;
        }
      case YT.IN_BODY:
        {
          bt(this, T);
          break;
        }
      case YT.IN_TABLE:
        {
          Qk(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          xg(this, T);
          break;
        }
      case YT.IN_CAPTION:
        {
          mg0(this, T);
          break;
        }
      case YT.IN_COLUMN_GROUP:
        {
          TrT(this, T);
          break;
        }
      case YT.IN_TABLE_BODY:
        {
          NH(this, T);
          break;
        }
      case YT.IN_ROW:
        {
          UH(this, T);
          break;
        }
      case YT.IN_CELL:
        {
          Pg0(this, T);
          break;
        }
      case YT.IN_SELECT:
        {
          DYT(this, T);
          break;
        }
      case YT.IN_SELECT_IN_TABLE:
        {
          xg0(this, T);
          break;
        }
      case YT.IN_TEMPLATE:
        {
          Ig0(this, T);
          break;
        }
      case YT.AFTER_BODY:
        {
          $g0(this, T);
          break;
        }
      case YT.IN_FRAMESET:
        {
          vg0(this, T);
          break;
        }
      case YT.AFTER_FRAMESET:
        {
          Sg0(this, T);
          break;
        }
      case YT.AFTER_AFTER_BODY:
        {
          dg0(this, T);
          break;
        }
      case YT.AFTER_AFTER_FRAMESET:
        {
          Eg0(this, T);
          break;
        }
      default:
    }
  }
  onEndTag(T) {
    if (this.skipNextNewLine = !1, this.currentToken = T, this.currentNotInHTML) Dg0(this, T);else this._endTagOutsideForeignContent(T);
  }
  _endTagOutsideForeignContent(T) {
    switch (this.insertionMode) {
      case YT.INITIAL:
        {
          kg(this, T);
          break;
        }
      case YT.BEFORE_HTML:
        {
          _I0(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
        {
          mI0(this, T);
          break;
        }
      case YT.IN_HEAD:
        {
          uI0(this, T);
          break;
        }
      case YT.IN_HEAD_NO_SCRIPT:
        {
          PI0(this, T);
          break;
        }
      case YT.AFTER_HEAD:
        {
          xI0(this, T);
          break;
        }
      case YT.IN_BODY:
        {
          BH(this, T);
          break;
        }
      case YT.TEXT:
        {
          ig0(this, T);
          break;
        }
      case YT.IN_TABLE:
        {
          kS(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          xg(this, T);
          break;
        }
      case YT.IN_CAPTION:
        {
          ug0(this, T);
          break;
        }
      case YT.IN_COLUMN_GROUP:
        {
          yg0(this, T);
          break;
        }
      case YT.IN_TABLE_BODY:
        {
          FY(this, T);
          break;
        }
      case YT.IN_ROW:
        {
          MYT(this, T);
          break;
        }
      case YT.IN_CELL:
        {
          kg0(this, T);
          break;
        }
      case YT.IN_SELECT:
        {
          wYT(this, T);
          break;
        }
      case YT.IN_SELECT_IN_TABLE:
        {
          fg0(this, T);
          break;
        }
      case YT.IN_TEMPLATE:
        {
          gg0(this, T);
          break;
        }
      case YT.AFTER_BODY:
        {
          NYT(this, T);
          break;
        }
      case YT.IN_FRAMESET:
        {
          jg0(this, T);
          break;
        }
      case YT.AFTER_FRAMESET:
        {
          Og0(this, T);
          break;
        }
      case YT.AFTER_AFTER_BODY:
        {
          HM(this, T);
          break;
        }
      default:
    }
  }
  onEof(T) {
    switch (this.insertionMode) {
      case YT.INITIAL:
        {
          kg(this, T);
          break;
        }
      case YT.BEFORE_HTML:
        {
          Ev(this, T);
          break;
        }
      case YT.BEFORE_HEAD:
        {
          Cv(this, T);
          break;
        }
      case YT.IN_HEAD:
        {
          Lv(this, T);
          break;
        }
      case YT.IN_HEAD_NO_SCRIPT:
        {
          Mv(this, T);
          break;
        }
      case YT.AFTER_HEAD:
        {
          Dv(this, T);
          break;
        }
      case YT.IN_BODY:
      case YT.IN_TABLE:
      case YT.IN_CAPTION:
      case YT.IN_COLUMN_GROUP:
      case YT.IN_TABLE_BODY:
      case YT.IN_ROW:
      case YT.IN_CELL:
      case YT.IN_SELECT:
      case YT.IN_SELECT_IN_TABLE:
        {
          dYT(this, T);
          break;
        }
      case YT.TEXT:
        {
          cg0(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          xg(this, T);
          break;
        }
      case YT.IN_TEMPLATE:
        {
          BYT(this, T);
          break;
        }
      case YT.AFTER_BODY:
      case YT.IN_FRAMESET:
      case YT.AFTER_FRAMESET:
      case YT.AFTER_AFTER_BODY:
      case YT.AFTER_AFTER_FRAMESET:
        {
          JtT(this, T);
          break;
        }
      default:
    }
  }
  onWhitespaceCharacter(T) {
    if (this.skipNextNewLine) {
      if (this.skipNextNewLine = !1, T.chars.charCodeAt(0) === HT.LINE_FEED) {
        if (T.chars.length === 1) return;
        T.chars = T.chars.substr(1);
      }
    }
    if (this.tokenizer.inForeignNode) {
      this._insertCharacters(T);
      return;
    }
    switch (this.insertionMode) {
      case YT.IN_HEAD:
      case YT.IN_HEAD_NO_SCRIPT:
      case YT.AFTER_HEAD:
      case YT.TEXT:
      case YT.IN_COLUMN_GROUP:
      case YT.IN_SELECT:
      case YT.IN_SELECT_IN_TABLE:
      case YT.IN_FRAMESET:
      case YT.AFTER_FRAMESET:
        {
          this._insertCharacters(T);
          break;
        }
      case YT.IN_BODY:
      case YT.IN_CAPTION:
      case YT.IN_CELL:
      case YT.IN_TEMPLATE:
      case YT.AFTER_BODY:
      case YT.AFTER_AFTER_BODY:
      case YT.AFTER_AFTER_FRAMESET:
        {
          $YT(this, T);
          break;
        }
      case YT.IN_TABLE:
      case YT.IN_TABLE_BODY:
      case YT.IN_ROW:
        {
          jF(this, T);
          break;
        }
      case YT.IN_TABLE_TEXT:
        {
          EYT(this, T);
          break;
        }
      default:
    }
  }
}