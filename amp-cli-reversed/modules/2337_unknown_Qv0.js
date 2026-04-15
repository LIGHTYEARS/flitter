function Yv0(T, R, a) {
  if (typeof R !== "string") a = R, R = void 0;
  return Qv0(a)(Gv0(Fv0(a).document().write(Kv0()(T, R, !0))));
}
function Qv0(T) {
  let R = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: r(hT),
      autolinkProtocol: g,
      autolinkEmail: g,
      atxHeading: r(U),
      blockQuote: r(lT),
      characterEscape: g,
      characterReference: g,
      codeFenced: r(N),
      codeFencedFenceInfo: h,
      codeFencedFenceMeta: h,
      codeIndented: r(N, h),
      codeText: r(q, h),
      codeTextData: g,
      data: g,
      codeFlowValue: g,
      definition: r(F),
      definitionDestinationString: h,
      definitionLabelString: h,
      definitionTitleString: h,
      emphasis: r(E),
      hardBreakEscape: r(Z),
      hardBreakTrailing: r(Z),
      htmlFlow: r(X, h),
      htmlFlowData: g,
      htmlText: r(X, h),
      htmlTextData: g,
      image: r(rT),
      label: h,
      link: r(hT),
      listItem: r(mT),
      listItemValue: o,
      listOrdered: r(pT, l),
      listUnordered: r(pT),
      paragraph: r(yT),
      reference: W,
      referenceString: h,
      resourceDestinationString: h,
      resourceTitleString: h,
      setextHeading: r(U),
      strong: r(uT),
      thematicBreak: r(jT)
    },
    exit: {
      atxHeading: c(),
      atxHeadingSequence: k,
      autolink: c(),
      autolinkEmail: tT,
      autolinkProtocol: TT,
      blockQuote: c(),
      characterEscapeValue: I,
      characterReferenceMarkerHexadecimal: iT,
      characterReferenceMarkerNumeric: iT,
      characterReferenceValue: aT,
      characterReference: oT,
      codeFenced: c(m),
      codeFencedFence: _,
      codeFencedFenceInfo: n,
      codeFencedFenceMeta: p,
      codeFlowValue: I,
      codeIndented: c(b),
      codeText: c(C),
      codeTextData: I,
      data: I,
      definition: c(),
      definitionDestinationString: P,
      definitionLabelString: y,
      definitionTitleString: u,
      emphasis: c(),
      hardBreakEscape: c(O),
      hardBreakTrailing: c(O),
      htmlFlow: c(j),
      htmlFlowData: I,
      htmlText: c(d),
      htmlTextData: I,
      image: c(w),
      label: B,
      labelText: D,
      lineEnding: S,
      link: c(L),
      listItem: c(),
      listOrdered: c(),
      listUnordered: c(),
      paragraph: c(),
      referenceString: eT,
      resourceDestinationString: M,
      resourceTitleString: V,
      resource: Q,
      setextHeading: c(v),
      setextHeadingLineSequence: f,
      setextHeadingText: x,
      strong: c(),
      thematicBreak: c()
    }
  };
  eQT(R, (T || {}).mdastExtensions || []);
  let a = {};
  return e;
  function e(fT) {
    let MT = {
        type: "root",
        children: []
      },
      UT = {
        stack: [MT],
        tokenStack: [],
        config: R,
        enter: i,
        exit: s,
        buffer: h,
        resume: A,
        data: a
      },
      QT = [],
      hR = -1;
    while (++hR < fT.length) if (fT[hR][1].type === "listOrdered" || fT[hR][1].type === "listUnordered") if (fT[hR][0] === "enter") QT.push(hR);else {
      let cR = QT.pop();
      hR = t(fT, cR, hR);
    }
    hR = -1;
    while (++hR < fT.length) {
      let cR = R[fT[hR][0]];
      if (aQT.call(cR, fT[hR][1].type)) cR[fT[hR][1].type].call(Object.assign({
        sliceSerialize: fT[hR][2].sliceSerialize
      }, UT), fT[hR][1]);
    }
    if (UT.tokenStack.length > 0) {
      let cR = UT.tokenStack[UT.tokenStack.length - 1];
      (cR[1] || qfT).call(UT, void 0, cR[0]);
    }
    MT.position = {
      start: ll(fT.length > 0 ? fT[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: ll(fT.length > 0 ? fT[fT.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, hR = -1;
    while (++hR < R.transforms.length) MT = R.transforms[hR](MT) || MT;
    return MT;
  }
  function t(fT, MT, UT) {
    let QT = MT - 1,
      hR = -1,
      cR = !1,
      kT,
      GT,
      NT,
      KT;
    while (++QT <= UT) {
      let $T = fT[QT];
      switch ($T[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote":
          {
            if ($T[0] === "enter") hR++;else hR--;
            KT = void 0;
            break;
          }
        case "lineEndingBlank":
          {
            if ($T[0] === "enter") {
              if (kT && !KT && !hR && !NT) NT = QT;
              KT = void 0;
            }
            break;
          }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          KT = void 0;
      }
      if (!hR && $T[0] === "enter" && $T[1].type === "listItemPrefix" || hR === -1 && $T[0] === "exit" && ($T[1].type === "listUnordered" || $T[1].type === "listOrdered")) {
        if (kT) {
          let OT = QT;
          GT = void 0;
          while (OT--) {
            let _T = fT[OT];
            if (_T[1].type === "lineEnding" || _T[1].type === "lineEndingBlank") {
              if (_T[0] === "exit") continue;
              if (GT) fT[GT][1].type = "lineEndingBlank", cR = !0;
              _T[1].type = "lineEnding", GT = OT;
            } else if (_T[1].type === "linePrefix" || _T[1].type === "blockQuotePrefix" || _T[1].type === "blockQuotePrefixWhitespace" || _T[1].type === "blockQuoteMarker" || _T[1].type === "listItemIndent") ;else break;
          }
          if (NT && (!GT || NT < GT)) kT._spread = !0;
          kT.end = Object.assign({}, GT ? fT[GT][1].start : $T[1].end), fT.splice(GT || QT, 0, ["exit", kT, $T[2]]), QT++, UT++;
        }
        if ($T[1].type === "listItemPrefix") {
          let OT = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, $T[1].start),
            end: void 0
          };
          kT = OT, fT.splice(QT, 0, ["enter", OT, $T[2]]), QT++, UT++, NT = void 0, KT = !0;
        }
      }
    }
    return fT[MT][1]._spread = cR, UT;
  }
  function r(fT, MT) {
    return UT;
    function UT(QT) {
      if (i.call(this, fT(QT), QT), MT) MT.call(this, QT);
    }
  }
  function h() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function i(fT, MT, UT) {
    this.stack[this.stack.length - 1].children.push(fT), this.stack.push(fT), this.tokenStack.push([MT, UT || void 0]), fT.position = {
      start: ll(MT.start),
      end: void 0
    };
  }
  function c(fT) {
    return MT;
    function MT(UT) {
      if (fT) fT.call(this, UT);
      s.call(this, UT);
    }
  }
  function s(fT, MT) {
    let UT = this.stack.pop(),
      QT = this.tokenStack.pop();
    if (!QT) throw Error("Cannot close `" + fT.type + "` (" + wv({
      start: fT.start,
      end: fT.end
    }) + "): it\u2019s not open");else if (QT[0].type !== fT.type) if (MT) MT.call(this, fT, QT[0]);else (QT[1] || qfT).call(this, fT, QT[0]);
    UT.position.end = ll(fT.end);
  }
  function A() {
    return RrT(this.stack.pop());
  }
  function l() {
    this.data.expectingFirstListItemValue = !0;
  }
  function o(fT) {
    if (this.data.expectingFirstListItemValue) {
      let MT = this.stack[this.stack.length - 2];
      MT.start = Number.parseInt(this.sliceSerialize(fT), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function n() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.lang = fT;
  }
  function p() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.meta = fT;
  }
  function _() {
    if (this.data.flowCodeInside) return;
    this.buffer(), this.data.flowCodeInside = !0;
  }
  function m() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.value = fT.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function b() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.value = fT.replace(/(\r?\n|\r)$/g, "");
  }
  function y(fT) {
    let MT = this.resume(),
      UT = this.stack[this.stack.length - 1];
    UT.label = MT, UT.identifier = _c(this.sliceSerialize(fT)).toLowerCase();
  }
  function u() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.title = fT;
  }
  function P() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.url = fT;
  }
  function k(fT) {
    let MT = this.stack[this.stack.length - 1];
    if (!MT.depth) {
      let UT = this.sliceSerialize(fT).length;
      MT.depth = UT;
    }
  }
  function x() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function f(fT) {
    let MT = this.stack[this.stack.length - 1];
    MT.depth = this.sliceSerialize(fT).codePointAt(0) === 61 ? 1 : 2;
  }
  function v() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function g(fT) {
    let MT = this.stack[this.stack.length - 1].children,
      UT = MT[MT.length - 1];
    if (!UT || UT.type !== "text") UT = bT(), UT.position = {
      start: ll(fT.start),
      end: void 0
    }, MT.push(UT);
    this.stack.push(UT);
  }
  function I(fT) {
    let MT = this.stack.pop();
    MT.value += this.sliceSerialize(fT), MT.position.end = ll(fT.end);
  }
  function S(fT) {
    let MT = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      let UT = MT.children[MT.children.length - 1];
      UT.position.end = ll(fT.end), this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && R.canContainEols.includes(MT.type)) g.call(this, fT), I.call(this, fT);
  }
  function O() {
    this.data.atHardBreak = !0;
  }
  function j() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.value = fT;
  }
  function d() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.value = fT;
  }
  function C() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.value = fT;
  }
  function L() {
    let fT = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      let MT = this.data.referenceType || "shortcut";
      fT.type += "Reference", fT.referenceType = MT, delete fT.url, delete fT.title;
    } else delete fT.identifier, delete fT.label;
    this.data.referenceType = void 0;
  }
  function w() {
    let fT = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      let MT = this.data.referenceType || "shortcut";
      fT.type += "Reference", fT.referenceType = MT, delete fT.url, delete fT.title;
    } else delete fT.identifier, delete fT.label;
    this.data.referenceType = void 0;
  }
  function D(fT) {
    let MT = this.sliceSerialize(fT),
      UT = this.stack[this.stack.length - 2];
    UT.label = RQT(MT), UT.identifier = _c(MT).toLowerCase();
  }
  function B() {
    let fT = this.stack[this.stack.length - 1],
      MT = this.resume(),
      UT = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, UT.type === "link") {
      let QT = fT.children;
      UT.children = QT;
    } else UT.alt = MT;
  }
  function M() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.url = fT;
  }
  function V() {
    let fT = this.resume(),
      MT = this.stack[this.stack.length - 1];
    MT.title = fT;
  }
  function Q() {
    this.data.inReference = void 0;
  }
  function W() {
    this.data.referenceType = "collapsed";
  }
  function eT(fT) {
    let MT = this.resume(),
      UT = this.stack[this.stack.length - 1];
    UT.label = MT, UT.identifier = _c(this.sliceSerialize(fT)).toLowerCase(), this.data.referenceType = "full";
  }
  function iT(fT) {
    this.data.characterReferenceType = fT.type;
  }
  function aT(fT) {
    let MT = this.sliceSerialize(fT),
      UT = this.data.characterReferenceType,
      QT;
    if (UT) QT = qYT(MT, UT === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0;else QT = arT(MT);
    let hR = this.stack[this.stack.length - 1];
    hR.value += QT;
  }
  function oT(fT) {
    let MT = this.stack.pop();
    MT.position.end = ll(fT.end);
  }
  function TT(fT) {
    I.call(this, fT);
    let MT = this.stack[this.stack.length - 1];
    MT.url = this.sliceSerialize(fT);
  }
  function tT(fT) {
    I.call(this, fT);
    let MT = this.stack[this.stack.length - 1];
    MT.url = "mailto:" + this.sliceSerialize(fT);
  }
  function lT() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function N() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function q() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function F() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function E() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function U() {
    return {
      type: "heading",
      depth: 0,
      children: []
    };
  }
  function Z() {
    return {
      type: "break"
    };
  }
  function X() {
    return {
      type: "html",
      value: ""
    };
  }
  function rT() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function hT() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function pT(fT) {
    return {
      type: "list",
      ordered: fT.type === "listOrdered",
      start: null,
      spread: fT._spread,
      children: []
    };
  }
  function mT(fT) {
    return {
      type: "listItem",
      spread: fT._spread,
      checked: null,
      children: []
    };
  }
  function yT() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function uT() {
    return {
      type: "strong",
      children: []
    };
  }
  function bT() {
    return {
      type: "text",
      value: ""
    };
  }
  function jT() {
    return {
      type: "thematicBreak"
    };
  }
}