function Gk0(T, R) {
  let a = Kk0(R.params);
  if (a.length === 0) a.push(0);
  let e = T;
  for (let t = 0; t < a.length; t++) {
    let r = a[t];
    switch (r) {
      case 0:
        e = new cT();
        break;
      case 1:
        e = e.copyWith({
          bold: !0
        });
        break;
      case 2:
        e = e.copyWith({
          dim: !0
        });
        break;
      case 3:
        e = e.copyWith({
          italic: !0
        });
        break;
      case 4:
        e = e.copyWith({
          underline: !0
        });
        break;
      case 9:
        e = e.copyWith({
          strikethrough: !0
        });
        break;
      case 22:
        e = e.copyWith({
          bold: !1,
          dim: !1
        });
        break;
      case 23:
        e = e.copyWith({
          italic: !1
        });
        break;
      case 24:
        e = e.copyWith({
          underline: !1
        });
        break;
      case 29:
        e = e.copyWith({
          strikethrough: !1
        });
        break;
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
        e = e.copyWith({
          color: LT.index(r - 30)
        });
        break;
      case 38:
        {
          let h = TfT(a, t);
          if (h.color) e = e.copyWith({
            color: h.color
          });
          t = h.nextIndex;
          break;
        }
      case 39:
        e = e.copyWith({
          color: LT.default()
        });
        break;
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        e = e.copyWith({
          backgroundColor: LT.index(r - 40)
        });
        break;
      case 48:
        {
          let h = TfT(a, t);
          if (h.color) e = e.copyWith({
            backgroundColor: h.color
          });
          t = h.nextIndex;
          break;
        }
      case 49:
        e = e.copyWith({
          backgroundColor: LT.default()
        });
        break;
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
        e = e.copyWith({
          color: LT.index(r - 90 + 8)
        });
        break;
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
        e = e.copyWith({
          backgroundColor: LT.index(r - 100 + 8)
        });
        break;
    }
  }
  return e;
}