class G {
  text;
  style;
  children;
  hyperlink;
  onClick;
  constructor(T, R, a, e, t) {
    this.text = T, this.style = R, this.children = a, this.hyperlink = e, this.onClick = t;
  }
  toPlainText() {
    let T = this.text ?? "";
    if (this.children) for (let R of this.children) T += R.toPlainText();
    return String(T);
  }
  equals(T) {
    if (!T) return !1;
    if (this.text !== T.text) return !1;
    if (this.hyperlink?.uri !== T.hyperlink?.uri) return !1;
    if (this.style !== T.style) {
      if (!this.style || !T.style) return !1;
      if (this.style.color !== T.style.color) return !1;
      if (this.style.backgroundColor !== T.style.backgroundColor) return !1;
      if (this.style.bold !== T.style.bold) return !1;
      if (this.style.italic !== T.style.italic) return !1;
      if (this.style.underline !== T.style.underline) return !1;
    }
    if (this.children?.length !== T.children?.length) return !1;
    if (this.children && T.children) for (let R = 0; R < this.children.length; R++) {
      let a = this.children[R],
        e = T.children[R];
      if (!a || !e || !a.equals(e)) return !1;
    }
    return !0;
  }
  visitTextSpan(T) {
    if (!T(this)) return;
    if (this.children) for (let R of this.children) R.visitTextSpan(T);
  }
}