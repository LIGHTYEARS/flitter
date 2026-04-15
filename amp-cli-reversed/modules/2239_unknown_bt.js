function GI0(T, R) {
  if (T.openElements.currentTagId === sT.OPTION) T.openElements.pop();
  T._reconstructActiveFormattingElements(), T._insertElement(R, VR.HTML);
}
function KI0(T, R) {
  if (T.openElements.hasInScope(sT.RUBY)) T.openElements.generateImpliedEndTags();
  T._insertElement(R, VR.HTML);
}
function VI0(T, R) {
  if (T.openElements.hasInScope(sT.RUBY)) T.openElements.generateImpliedEndTagsWithExclusion(sT.RTC);
  T._insertElement(R, VR.HTML);
}
function XI0(T, R) {
  if (T._reconstructActiveFormattingElements(), fYT(R), YtT(R), R.selfClosing) T._appendElement(R, VR.MATHML);else T._insertElement(R, VR.MATHML);
  R.ackSelfClosing = !0;
}
function YI0(T, R) {
  if (T._reconstructActiveFormattingElements(), IYT(R), YtT(R), R.selfClosing) T._appendElement(R, VR.SVG);else T._insertElement(R, VR.SVG);
  R.ackSelfClosing = !0;
}
function jfT(T, R) {
  T._reconstructActiveFormattingElements(), T._insertElement(R, VR.HTML);
}
function bt(T, R) {
  switch (R.tagID) {
    case sT.I:
    case sT.S:
    case sT.B:
    case sT.U:
    case sT.EM:
    case sT.TT:
    case sT.BIG:
    case sT.CODE:
    case sT.FONT:
    case sT.SMALL:
    case sT.STRIKE:
    case sT.STRONG:
      {
        LI0(T, R);
        break;
      }
    case sT.A:
      {
        CI0(T, R);
        break;
      }
    case sT.H1:
    case sT.H2:
    case sT.H3:
    case sT.H4:
    case sT.H5:
    case sT.H6:
      {
        vI0(T, R);
        break;
      }
    case sT.P:
    case sT.DL:
    case sT.OL:
    case sT.UL:
    case sT.DIV:
    case sT.DIR:
    case sT.NAV:
    case sT.MAIN:
    case sT.MENU:
    case sT.ASIDE:
    case sT.CENTER:
    case sT.FIGURE:
    case sT.FOOTER:
    case sT.HEADER:
    case sT.HGROUP:
    case sT.DIALOG:
    case sT.DETAILS:
    case sT.ADDRESS:
    case sT.ARTICLE:
    case sT.SEARCH:
    case sT.SECTION:
    case sT.SUMMARY:
    case sT.FIELDSET:
    case sT.BLOCKQUOTE:
    case sT.FIGCAPTION:
      {
        $I0(T, R);
        break;
      }
    case sT.LI:
    case sT.DD:
    case sT.DT:
      {
        OI0(T, R);
        break;
      }
    case sT.BR:
    case sT.IMG:
    case sT.WBR:
    case sT.AREA:
    case sT.EMBED:
    case sT.KEYGEN:
      {
        jYT(T, R);
        break;
      }
    case sT.HR:
      {
        UI0(T, R);
        break;
      }
    case sT.RB:
    case sT.RTC:
      {
        KI0(T, R);
        break;
      }
    case sT.RT:
    case sT.RP:
      {
        VI0(T, R);
        break;
      }
    case sT.PRE:
    case sT.LISTING:
      {
        jI0(T, R);
        break;
      }
    case sT.XMP:
      {
        qI0(T, R);
        break;
      }
    case sT.SVG:
      {
        YI0(T, R);
        break;
      }
    case sT.HTML:
      {
        fI0(T, R);
        break;
      }
    case sT.BASE:
    case sT.LINK:
    case sT.META:
    case sT.STYLE:
    case sT.TITLE:
    case sT.SCRIPT:
    case sT.BGSOUND:
    case sT.BASEFONT:
    case sT.TEMPLATE:
      {
        Bc(T, R);
        break;
      }
    case sT.BODY:
      {
        II0(T, R);
        break;
      }
    case sT.FORM:
      {
        SI0(T, R);
        break;
      }
    case sT.NOBR:
      {
        MI0(T, R);
        break;
      }
    case sT.MATH:
      {
        XI0(T, R);
        break;
      }
    case sT.TABLE:
      {
        wI0(T, R);
        break;
      }
    case sT.INPUT:
      {
        BI0(T, R);
        break;
      }
    case sT.PARAM:
    case sT.TRACK:
    case sT.SOURCE:
      {
        NI0(T, R);
        break;
      }
    case sT.IMAGE:
      {
        HI0(T, R);
        break;
      }
    case sT.BUTTON:
      {
        EI0(T, R);
        break;
      }
    case sT.APPLET:
    case sT.OBJECT:
    case sT.MARQUEE:
      {
        DI0(T, R);
        break;
      }
    case sT.IFRAME:
      {
        zI0(T, R);
        break;
      }
    case sT.SELECT:
      {
        FI0(T, R);
        break;
      }
    case sT.OPTION:
    case sT.OPTGROUP:
      {
        GI0(T, R);
        break;
      }
    case sT.NOEMBED:
    case sT.NOFRAMES:
      {
        vfT(T, R);
        break;
      }
    case sT.FRAMESET:
      {
        gI0(T, R);
        break;
      }
    case sT.TEXTAREA:
      {
        WI0(T, R);
        break;
      }
    case sT.NOSCRIPT:
      {
        if (T.options.scriptingEnabled) vfT(T, R);else jfT(T, R);
        break;
      }
    case sT.PLAINTEXT:
      {
        dI0(T, R);
        break;
      }
    case sT.COL:
    case sT.TH:
    case sT.TD:
    case sT.TR:
    case sT.HEAD:
    case sT.FRAME:
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
    case sT.CAPTION:
    case sT.COLGROUP:
      break;
    default:
      jfT(T, R);
  }
}