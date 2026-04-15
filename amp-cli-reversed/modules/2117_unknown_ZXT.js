class ZXT {
  enabled = !1;
  tracker = new QXT();
  setEnabled(T) {
    this.enabled = T;
  }
  isEnabled() {
    return this.enabled;
  }
  recordKeyEvent(T) {
    this.tracker.recordKeyEvent(T);
  }
  recordMouseEvent(T) {
    this.tracker.recordMouseEvent(T);
  }
  recordStats(T, R) {
    this.tracker.recordFrame(T.lastFrameTime);
    for (let a of Object.values(LtT)) this.tracker.recordPhase(a, T.phaseStats[a].lastTime);
    if (R) this.tracker.recordRepaintPercent(R.repaintedPercent), this.tracker.recordBytesWritten(R.bytesWritten);
  }
  draw(T, R) {
    if (!this.enabled) return;
    let {
        width: a,
        height: e
      } = T.getSize(),
      t = 34,
      r = 14,
      h = a - t - 2,
      i = 1;
    if (h < 0 || i + r >= e) return;
    let c = Gt.default().colorScheme,
      s = c.border,
      A = c.foreground,
      l = c.warning,
      o = " Gotta Go Fast ",
      n = Math.floor((t - o.length) / 2);
    T.setCell(h, i, a9("\u256D", {
      fg: A
    }));
    for (let hT = 1; hT < t - 1; hT++) if (hT >= n && hT < n + o.length) T.setCell(h + hT, i, a9(o[hT - n] || "\u2500", {
      fg: l
    }));else T.setCell(h + hT, i, a9("\u2500", {
      fg: A
    }));
    T.setCell(h + t - 1, i, a9("\u256E", {
      fg: A
    }));
    for (let hT = 1; hT < r - 1; hT++) {
      T.setCell(h, i + hT, a9("\u2502", {
        fg: A
      })), T.setCell(h + t - 1, i + hT, a9("\u2502", {
        fg: A
      }));
      for (let pT = 1; pT < t - 1; pT++) T.setCell(h + pT, i + hT, a9(" ", {
        fg: A
      }));
    }
    T.setCell(h, i + r - 1, a9("\u2570", {
      fg: A
    }));
    for (let hT = 1; hT < t - 1; hT++) T.setCell(h + hT, i + r - 1, a9("\u2500", {
      fg: A
    }));
    T.setCell(h + t - 1, i + r - 1, a9("\u256F", {
      fg: A
    }));
    let p = h + 1,
      _ = i + 1;
    this.drawText(T, p, _++, "          Last    P95    P99", s);
    let m = this.tracker.getLastKeyEventTime(),
      b = this.tracker.getKeyEventP95(),
      y = this.tracker.getKeyEventP99(),
      u = m.toFixed(2).padStart(5, " "),
      P = b.toFixed(2).padStart(5, " "),
      k = y.toFixed(2).padStart(5, " "),
      x = this.getTimingColor(m),
      f = this.getTimingColor(b),
      v = this.getTimingColor(y);
    this.drawLastP95P99Row(T, p, _++, {
      label: "Key",
      labelColor: s,
      last: {
        text: u,
        color: x
      },
      p95: {
        text: P,
        color: f
      },
      p99: {
        text: k,
        color: v
      }
    });
    let g = this.tracker.getLastMouseEventTime(),
      I = this.tracker.getMouseEventP95(),
      S = this.tracker.getMouseEventP99(),
      O = g.toFixed(2).padStart(5, " "),
      j = I.toFixed(2).padStart(5, " "),
      d = S.toFixed(2).padStart(5, " "),
      C = this.getTimingColor(g),
      L = this.getTimingColor(I),
      w = this.getTimingColor(S);
    this.drawLastP95P99Row(T, p, _++, {
      label: "Mouse",
      labelColor: s,
      last: {
        text: O,
        color: C
      },
      p95: {
        text: j,
        color: L
      },
      p99: {
        text: d,
        color: w
      }
    }), _++;
    for (let hT of ["build", "layout", "paint", "render"]) {
      let pT = R.phaseStats[hT].lastTime,
        mT = this.tracker.getPhaseP95(hT),
        yT = this.tracker.getPhaseP99(hT),
        uT = pT.toFixed(2).padStart(5, " "),
        bT = mT.toFixed(2).padStart(5, " "),
        jT = yT.toFixed(2).padStart(5, " "),
        fT = this.getTimingColor(pT),
        MT = this.getTimingColor(mT),
        UT = this.getTimingColor(yT),
        QT = hT.charAt(0).toUpperCase() + hT.slice(1);
      this.drawLastP95P99Row(T, p, _++, {
        label: QT,
        labelColor: s,
        last: {
          text: uT,
          color: fT
        },
        p95: {
          text: bT,
          color: MT
        },
        p99: {
          text: jT,
          color: UT
        }
      });
    }
    _++;
    let D = R.lastFrameTime,
      B = this.tracker.getFrameP95(),
      M = this.tracker.getFrameP99(),
      V = D.toFixed(2).padStart(5, " "),
      Q = B.toFixed(2).padStart(5, " "),
      W = M.toFixed(2).padStart(5, " "),
      eT = this.getTimingColor(D),
      iT = this.getTimingColor(B),
      aT = this.getTimingColor(M);
    this.drawLastP95P99Row(T, p, _++, {
      label: "Frame",
      labelColor: A,
      last: {
        text: V,
        color: eT
      },
      p95: {
        text: Q,
        color: iT
      },
      p99: {
        text: W,
        color: aT
      }
    });
    let oT = this.tracker.getLastRepaintPercent(),
      TT = this.tracker.getRepaintPercentP95(),
      tT = this.tracker.getRepaintPercentP99(),
      lT = `${oT.toFixed(1)}%`.padStart(5, " "),
      N = `${TT.toFixed(1)}%`.padStart(5, " "),
      q = `${tT.toFixed(1)}%`.padStart(5, " "),
      F = this.getPercentColor(oT),
      E = this.getPercentColor(TT),
      U = this.getPercentColor(tT);
    this.drawLastP95P99Row(T, p, _++, {
      label: "Repaint",
      labelColor: A,
      last: {
        text: lT,
        color: F
      },
      p95: {
        text: N,
        color: E
      },
      p99: {
        text: q,
        color: U
      }
    });
    let Z = this.formatBytes(this.tracker.getLastBytesWritten()).padStart(5, " "),
      X = this.formatBytes(this.tracker.getBytesWrittenP95()).padStart(5, " "),
      rT = this.formatBytes(this.tracker.getBytesWrittenP99()).padStart(5, " ");
    this.drawLastP95P99Row(T, p, _, {
      label: "Bytes",
      labelColor: A,
      last: {
        text: Z,
        color: A
      },
      p95: {
        text: X,
        color: A
      },
      p99: {
        text: rT,
        color: A
      }
    });
  }
  drawLastP95P99Row(T, R, a, e) {
    let t = ` ${e.label.padStart(7, " ")} `,
      r = R;
    this.drawText(T, r, a, t, e.labelColor), r += t.length, this.drawText(T, r, a, e.last.text, e.last.color), r += e.last.text.length, this.drawText(T, r, a, "   ", e.labelColor), r += 3, this.drawText(T, r, a, e.p95.text, e.p95.color), r += e.p95.text.length, this.drawText(T, r, a, "   ", e.labelColor), r += 3, this.drawText(T, r, a, e.p99.text, e.p99.color);
  }
  getTimingColor(T) {
    let R = Gt.default().colorScheme,
      a = cP,
      e = cP * 0.7;
    if (T >= a) return R.destructive;
    if (T >= e) return R.warning;
    return R.foreground;
  }
  getPercentColor(T) {
    let R = Gt.default().colorScheme;
    if (T >= 50) return R.destructive;
    if (T >= 20) return R.warning;
    return R.foreground;
  }
  drawText(T, R, a, e, t) {
    for (let r = 0; r < e.length; r++) T.setCell(R + r, a, a9(e[r] || " ", {
      fg: t
    }));
  }
  formatBytes(T) {
    if (T >= 1e4) return `${Math.round(T / 1000)}k`;
    if (T >= 1000) return `${(T / 1000).toFixed(1)}k`;
    return `${Math.round(T)}`;
  }
}