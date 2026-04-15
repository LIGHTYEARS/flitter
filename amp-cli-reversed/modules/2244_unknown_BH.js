function BH(T, R) {
  switch (R.tagID) {
    case sT.A:
    case sT.B:
    case sT.I:
    case sT.S:
    case sT.U:
    case sT.EM:
    case sT.TT:
    case sT.BIG:
    case sT.CODE:
    case sT.FONT:
    case sT.NOBR:
    case sT.SMALL:
    case sT.STRIKE:
    case sT.STRONG:
      {
        ZtT(T, R);
        break;
      }
    case sT.P:
      {
        Rg0(T);
        break;
      }
    case sT.DL:
    case sT.UL:
    case sT.OL:
    case sT.DIR:
    case sT.DIV:
    case sT.NAV:
    case sT.PRE:
    case sT.MAIN:
    case sT.MENU:
    case sT.ASIDE:
    case sT.BUTTON:
    case sT.CENTER:
    case sT.FIGURE:
    case sT.FOOTER:
    case sT.HEADER:
    case sT.HGROUP:
    case sT.DIALOG:
    case sT.ADDRESS:
    case sT.ARTICLE:
    case sT.DETAILS:
    case sT.SEARCH:
    case sT.SECTION:
    case sT.SUMMARY:
    case sT.LISTING:
    case sT.FIELDSET:
    case sT.BLOCKQUOTE:
    case sT.FIGCAPTION:
      {
        JI0(T, R);
        break;
      }
    case sT.LI:
      {
        ag0(T);
        break;
      }
    case sT.DD:
    case sT.DT:
      {
        eg0(T, R);
        break;
      }
    case sT.H1:
    case sT.H2:
    case sT.H3:
    case sT.H4:
    case sT.H5:
    case sT.H6:
      {
        tg0(T);
        break;
      }
    case sT.BR:
      {
        hg0(T);
        break;
      }
    case sT.BODY:
      {
        QI0(T, R);
        break;
      }
    case sT.HTML:
      {
        ZI0(T, R);
        break;
      }
    case sT.FORM:
      {
        Tg0(T);
        break;
      }
    case sT.APPLET:
    case sT.OBJECT:
    case sT.MARQUEE:
      {
        rg0(T, R);
        break;
      }
    case sT.TEMPLATE:
      {
        Vm(T, R);
        break;
      }
    default:
      OYT(T, R);
  }
}